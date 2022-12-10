// SPDX-License-Identifier: MIT
// 1. Pragma
pragma solidity ^0.8.8;

// 2. Imports
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./pharmaTrace-NFT.sol";
import "./helper.sol";
import "./marketplace-interface.sol";

/**@title A Pharmatrace  NFT MarketPlace contract
 * @author Touqeer Shah
 * @notice This contract is for creating a Lazy NFT
 * @dev Create MarketPlace for PhramaTrace
 */
contract PTNFTMarketPlace is ReentrancyGuard, Marketplace_Interface {
    // Type Declarations
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // State variables
    address private s_nftContractAddress;
    Counters.Counter private _itemCounter;
    Counters.Counter private _itemSoldCounter;
    Counters.Counter private _totalOfferOnMarketPlace;
    address payable immutable i_marketowner;
    uint256 private s_listingFee = 25; // 2.5%
    IERC20[] public AllowedCrypto; // this will tell as what different token we are support in  our Marketplace

    // mapping(uint256 => Offer) private s_offers;
    mapping(address => mapping(uint256 => Offer)) private s_offers;
    mapping(address => mapping(uint256 => Offer)) private s_marketOffers;
    mapping(address => uint256) private s_amounts;
    mapping(address => mapping(uint256 => MarketItem)) public s_marketItems;

    // // Modifiers
    modifier onlyMarketplaceOwner() {
        // require(msg.sender == i_owner);
        if (msg.sender != i_marketowner) revert PTNFTMarketPlace__NotOwner();
        _;
    }
    modifier notListed(address nftAddress, uint256 tokenId) {
        MarketItem memory item = s_marketItems[nftAddress][tokenId];
        if (item.minPrice > 0) {
            revert PTNFTMarketPlace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        MarketItem memory item = s_marketItems[nftAddress][tokenId];
        if (item.minPrice <= 0) {
            revert PTNFTMarketPlace__ItemIdInvalid(nftAddress, tokenId);
        }
        _;
    }

    //// constructor
    constructor() {
        i_marketowner = payable(msg.sender);
    }

    //// receive
    receive() external payable {
        s_amounts[msg.sender] += msg.value;
        emit ReceivedCalled(msg.sender, msg.value);
    }

    //// fallback
    fallback() external payable {
        s_amounts[msg.sender] += msg.value;
        emit FallbackCalled(msg.sender, msg.value);
    }

    //// public
    ///////////
    /// @notice Following are the Function for related to Lazz NFT Miting and Offers.
    //////////////

    /// @notice this function is used to create offer for Lazz NFT which is not minted yet.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    /// @param numberOfDays it will tell number of days this offer will expired.
    /// @param _offerAmount number of token user offer to buy this NFT
    function createOfferFoRLazzNFT(
        NFTVoucher calldata voucher,
        uint256 numberOfDays,
        uint256 _offerAmount
    ) public payable nonReentrant {
        if (numberOfDays <= 0) revert PTNFTMarketPlace__ValueShouldGreaterThenZero(); // the number of days should be greater then zero
        PTNFT(s_nftContractAddress)._verify(voucher); // this external call to function to verify the structure of vocher is valid
        // verify the voucher from PTNFT
        address oldOfferBy = address(0);
        uint256 oldOfferValue = 0;
        /* address signer =*/
        Offer memory offer = getOffer(s_nftContractAddress, voucher.tokenId); // check any old offer exist
        checkERC20Requirment(_offerAmount, msg.sender, 1);
        checkRequirment(offer.status, offer.expiresAt, offer.offerAmount, 1, _offerAmount); // verify values like is older offer is expired or not ...
        if (offer.expiresAt != 0 && offer.offerAmount != 0) {
            // if older offer is either expired or less then new one then discard old offer and accept new one
            s_amounts[offer.offerBy] += offer.offerAmount;
            oldOfferValue = offer.offerAmount;
            oldOfferBy = offer.offerBy;
        }
        // if (voucher.maxPrice < msg.value && voucher.maxPrice > msg.value)
        //     revert PTNFTMarketPlace__AmountNoExceedMaxPrice();

        s_offers[s_nftContractAddress][voucher.tokenId] = setOfferStruct(
            offer,
            voucher.tokenId,
            _offerAmount,
            msg.sender,
            numberOfDays
        );
        _totalOfferOnMarketPlace.increment();

        if (oldOfferValue != 0)
            emit WithDrawRefundAmount(
                offer.tokenId,
                s_nftContractAddress,
                oldOfferBy,
                oldOfferValue
            );
        emit TotalNumberOfOfferOnMarketPlace(_totalOfferOnMarketPlace.current());
        emit CreateOffer(
            offer.tokenId,
            s_nftContractAddress,
            offer.offerAmount,
            offer.totalOffers,
            offer.startAt,
            offer.expiresAt,
            offer.offerBy,
            offer.status
        );
    }

    /// @notice this function is used to buy Lazz NFT and mint it by pay the maxPrice of that NFT.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    /// @param _offerAmount offer amount in token you want to buy

    function buyLazzNFT(NFTVoucher calldata voucher, uint256 _offerAmount)
        public
        payable
        nonReentrant
    {
        // verify the voucher from PTNFT
        address oldOfferBy = address(0);
        uint256 oldOfferValue = 0;
        address signer = PTNFT(s_nftContractAddress)._verify(voucher); // get address of the owner from token signature
        Offer memory offer = getOffer(s_nftContractAddress, voucher.tokenId); // check older offer
        checkERC20Requirment(_offerAmount, msg.sender, 1);
        checkRequirment(offer.status, offer.expiresAt, offer.offerAmount, 1, _offerAmount); // verify basic conditions are fullfil
        if (offer.expiresAt != 0 && offer.offerAmount != 0) {
            s_amounts[offer.offerBy] += offer.offerAmount; // set old offer amount into refund
            oldOfferValue = offer.offerAmount;
            oldOfferBy = offer.offerBy;
        }
        // if (voucher.maxPrice != msg.value) revert PTNFTMarketPlace__AmountNoExceedMaxPrice();
        s_amounts[i_marketowner] += getPercentage(_offerAmount); // get the percentage  of amount which for marketplace
        s_amounts[signer] += (_offerAmount - getPercentage(_offerAmount)); // and set remaining money after minus the marketplace fee
        delete s_offers[s_nftContractAddress][voucher.tokenId]; // delete the offer record
        s_offers[s_nftContractAddress][voucher.tokenId].status = OfferState.CLOSE; // mark as close as well

        AllowedCrypto[1].transferFrom(msg.sender, address(this), _offerAmount);
        PTNFT(s_nftContractAddress).redeem(msg.sender, voucher); // external call to mint and transfer to new owner

        _itemSoldCounter.increment(); //  total new Item are sold in marketplace
        emit TotalNumberOfItemMarketPlace(_itemSoldCounter.current());
        if (oldOfferValue != 0) {
            emit WithDrawRefundAmount(
                offer.tokenId,
                s_nftContractAddress,
                oldOfferBy,
                oldOfferValue
            );
        }
        emit BuyNFT(
            voucher.tokenId,
            signer,
            s_nftContractAddress,
            _offerAmount,
            payable(msg.sender)
        );
    }

    /// @notice this function is used to accept any offer for Lazz NFT and mint it and transfer that NFT to buyer.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    // / @param _offerAmount offer amount in token you want to buy

    function acceptLazzNFTOffer(NFTVoucher calldata voucher) public payable nonReentrant {
        address signer = PTNFT(s_nftContractAddress)._verify(voucher);
        if (signer != msg.sender) {
            revert PTNFTMarketPlace__NotOwner();
        }
        Offer memory offer = getOffer(s_nftContractAddress, voucher.tokenId);
        // checkERC20Requirment(_offerAmount,offer, 1);
        // checkERC20Requirment(offer.offerAmount, offer.offerBy, 1);

        if (offer.startAt <= 0) {
            revert PTNFTMarketPlace__NoOfferExist();
        }
        if (offer.expiresAt < (block.timestamp + 40)) {
            // it will not allow owner to accept the offer once it is expired
            revert PTNFTMarketPlace__OfferTimeExpired();
        }

        s_amounts[i_marketowner] += getPercentage(offer.offerAmount); // calculate the fee according to the percentage of offer amount
        s_amounts[signer] += (offer.offerAmount - getPercentage(offer.offerAmount)); // calculate the amount minus the marketplace fee
        delete s_offers[s_nftContractAddress][voucher.tokenId]; // delete the complete offer record
        s_offers[s_nftContractAddress][voucher.tokenId].status = OfferState.CLOSE;
        // AllowedCrypto[1].transferFrom(msg.sender, address(this), _offerAmount);

        PTNFT(s_nftContractAddress).redeem(offer.offerBy, voucher); // mine NFT and Transfer
        _itemSoldCounter.increment();
        emit TotalNumberOfItemMarketPlace(_itemSoldCounter.current());

        emit AcceptOffer(
            offer.tokenId,
            signer,
            s_nftContractAddress,
            offer.offerAmount,
            offer.offerBy,
            OfferState.CLOSE
        );
    }

    /// @notice this function is used to reject any offer for Lazz NFT and return offer amount to  buyer.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    function rejectLazzNFTOffer(NFTVoucher calldata voucher) public payable nonReentrant {
        address signer = PTNFT(s_nftContractAddress)._verify(voucher);
        if (signer != msg.sender) revert PTNFTMarketPlace__NotOwner(); // only owner of NFT will reject the
        Offer memory offer = getOffer(s_nftContractAddress, voucher.tokenId);
        if (offer.startAt <= 0) {
            revert PTNFTMarketPlace__NoOfferExist();
        }
        if (offer.expiresAt < (block.timestamp + 40)) {
            // if offer is already expired
            revert PTNFTMarketPlace__OfferTimeExpired();
        }
        address oldOfferBy = offer.offerBy;
        uint256 oldOfferValue = offer.offerAmount;
        s_amounts[offer.offerBy] += offer.offerAmount;

        delete s_offers[s_nftContractAddress][voucher.tokenId];
        emit WithDrawRefundAmount(offer.tokenId, s_nftContractAddress, oldOfferBy, oldOfferValue);
        emit RejectOffer(
            offer.tokenId,
            signer,
            s_nftContractAddress,
            offer.offerAmount,
            offer.offerBy,
            offer.status
        );
    }

    // Market Place
    /// @notice this function is used to resale the NFT on the Market.
    /// @param itemId ID which token you want to sale.
    /// @param minPrice in which owner want to sale.
    /// @param isFixedPrice true mean no offer and false mean enable place offer.
    /// @param expiresAt time to expired from market sale.
    /// @param nftAddress address of the contract which you want to listed
    /// @param pid this index of ERC20 Token address

    function createMarketItem(
        uint256 itemId,
        uint256 minPrice,
        bool isFixedPrice,
        uint256 expiresAt,
        address nftAddress,
        uint256 pid
    ) public nonReentrant notListed(nftAddress, itemId) {
        IERC721 nft = IERC721(nftAddress);

        if (minPrice <= 0) revert PTNFTMarketPlace__ValueShouldGreaterThenZero(); // listed price should be greater then Zero
        if (!isFixedPrice && expiresAt <= 0) revert PTNFTMarketPlace__ValueShouldGreaterThenZero(); // if  aution the should be expirer date
        if (nft.getApproved(itemId) != address(this)) revert PTNFTMarketPlace__PermissionRequired(); // it also allow to markeplace
        if (nft.ownerOf(itemId) != msg.sender) revert PTNFTMarketPlace__NotOwner(); // only owner of NFT will list into market

        _itemCounter.increment();

        s_marketItems[nftAddress][itemId] = MarketItem( // list the New Item in markeplace
            itemId,
            payable(msg.sender),
            payable(address(0)),
            minPrice,
            isFixedPrice,
            block.timestamp,
            isFixedPrice ? 0 : block.timestamp + (expiresAt * 1 days),
            pid,
            State.Created
        );

        emit MarketItemCreated(
            itemId,
            nftAddress,
            payable(msg.sender),
            payable(address(0)),
            minPrice,
            isFixedPrice,
            block.timestamp,
            isFixedPrice ? 0 : block.timestamp + (expiresAt * 1 days),
            State.Created
        );
    }

    /// @notice delete a MarketItem from the marketplace.
    /// @param itemId  which record.
    /// @param nftAddress address of the contract which you want to listed

    function deleteMarketItem(uint256 itemId, address nftAddress)
        public
        nonReentrant
        isListed(nftAddress, itemId)
    {
        IERC721 nft = IERC721(nftAddress);
        address oldOfferBy = address(0);
        uint256 oldOfferValue = 0;
        if (s_marketItems[nftAddress][itemId].state != State.Created)
            // if item is created that mean it exist and active
            revert PTNFTMarketPlace__NotAvailableForOffer();
        MarketItem storage item = s_marketItems[nftAddress][itemId];

        if (nft.ownerOf(item.tokenId) != msg.sender) revert PTNFTMarketPlace__NotOwner(); // only owner can remove from listinf

        Offer memory offer = getMarketOffer(nftAddress, item.tokenId); // if any offer on that listed item revert the amount
        if (offer.expiresAt != 0 && offer.offerAmount != 0) {
            s_amounts[offer.offerBy] += offer.offerAmount;
            oldOfferValue = offer.offerAmount;
            oldOfferBy = offer.offerBy;
        }
        item.state = State.Inactive;

        // PTNFT(s_nftContractAddress).revertApprovalForAll(address(0), item.tokenId);
        if (oldOfferValue != 0) {
            emit WithDrawRefundAmount(
                offer.tokenId,
                s_nftContractAddress,
                oldOfferBy,
                oldOfferValue
            );
        }
        emit MarketItemDelete(item.tokenId, nftAddress, item.seller, item.state);
    }

    /// @notice place offer for marketplace item.
    /// @param itemId  which record.
    /// @param numberOfDays  offer expired time in days.
    /// @param nftAddress address of the contract which you want to listed
    /// @param offerAmount offer amount in token you want to buy

    function createOffer(
        uint16 itemId,
        uint16 numberOfDays,
        address nftAddress,
        uint256 offerAmount
    ) public payable nonReentrant isListed(nftAddress, itemId) {
        if (numberOfDays <= 0) revert PTNFTMarketPlace__ValueShouldGreaterThenZero(); // number of day of offer should be greater the 0
        address oldOfferBy = address(0);
        uint256 oldOfferValue = 0;
        IERC721 nft = IERC721(nftAddress);
        MarketItem storage item = checkRequirmentMarketPlace(itemId, nftAddress, nft); // check basic things
        if (item.isFixedPrice) revert PTNFTMarketPlace__FixedPirceMarketItem(); // offer is allow only when listed item is on not fixed price
        if (item.expiresAt < (block.timestamp + 40)) {
            // listed item is not expired
            revert PTNFTMarketPlace__MarketItemExpired();
        }
        checkERC20Requirment(offerAmount, msg.sender, item.pid);

        /* address signer =*/
        Offer memory offer = getMarketOffer(nftAddress, item.tokenId); // get if any older offer exist
        checkRequirment(
            offer.status,
            offer.expiresAt,
            offer.offerAmount,
            item.minPrice,
            offerAmount
        ); // compaired new offer with old one
        if (offer.expiresAt != 0 && offer.offerAmount != 0) {
            // if new offer is greater the old one then revert the old amount
            s_amounts[offer.offerBy] += offer.offerAmount;
            oldOfferValue = offer.offerAmount;
            oldOfferBy = offer.offerBy;
        }
        s_marketOffers[nftAddress][item.tokenId] = setOfferStruct( //update the new offer
            offer,
            item.tokenId,
            offerAmount,
            msg.sender,
            numberOfDays
        );
        _totalOfferOnMarketPlace.increment();
        emit TotalNumberOfOfferOnMarketPlace(_totalOfferOnMarketPlace.current());

        if (oldOfferValue != 0) {
            emit WithDrawRefundAmount(
                offer.tokenId,
                s_nftContractAddress,
                oldOfferBy,
                oldOfferValue
            );
        }
        emit CreateOffer(
            offer.tokenId,
            nftAddress,
            offer.offerAmount,
            offer.totalOffers,
            offer.startAt,
            offer.expiresAt,
            offer.offerBy,
            offer.status
        );
    }

    /// @notice buy NFT on maxPirce.
    /// @param itemId  which record.
    /// @param nftAddress address of the contract which you want to listed
    /// @param offerAmount offer amount in token you want to buy

    function buy(
        uint256 itemId,
        address nftAddress,
        uint256 offerAmount
    ) public payable nonReentrant isListed(nftAddress, itemId) {
        // verify the voucher from PTNFT
        address oldOfferBy = address(0);
        uint256 oldOfferValue = 0;

        IERC721 nft = IERC721(nftAddress);
        MarketItem storage item = checkRequirmentMarketPlace(itemId, nftAddress, nft); // check basic the requirement
        checkERC20Requirment(offerAmount, msg.sender, item.pid);

        if (item.expiresAt < (block.timestamp + 40)) {
            // if listed item is not expired
            revert PTNFTMarketPlace__MarketItemExpired();
        }
        /* address signer =*/

        Offer memory offer = getMarketOffer(nftAddress, item.tokenId); // get old offer and compaired with new one
        checkRequirment(
            offer.status,
            offer.expiresAt,
            offer.offerAmount,
            item.minPrice,
            offerAmount
        );
        if (offer.expiresAt != 0 && offer.offerAmount != 0) {
            s_amounts[offer.offerBy] += offer.offerAmount;
            oldOfferValue = offer.offerAmount;
            oldOfferBy = offer.offerBy;
        }
        // if (item.maxPrice != msg.value) revert PTNFTMarketPlace__AmountNoExceedMaxPrice();

        item.buyer = payable(msg.sender); // set item buyer
        item.state = State.Release;
        s_amounts[i_marketowner] += getPercentage(offerAmount); // calculate market place fee
        s_amounts[item.seller] += (offerAmount - getPercentage(offerAmount)); // calculate owner amount after minus the market fee
        delete s_marketOffers[nftAddress][item.tokenId];

        // s_marketOffers[nftAddress][item.tokenId].status = OfferState.CLOSE;
        AllowedCrypto[item.pid].transferFrom(msg.sender, address(this), offerAmount);
        nft.transferFrom(item.seller, msg.sender, item.tokenId);
        _itemSoldCounter.increment();
        emit TotalNumberOfItemMarketPlace(_itemSoldCounter.current());
        if (oldOfferValue != 0) {
            emit WithDrawRefundAmount(
                offer.tokenId,
                s_nftContractAddress,
                oldOfferBy,
                oldOfferValue
            );
        }
        emit BuyNFT(offer.tokenId, item.seller, nftAddress, offerAmount, payable(msg.sender));
    }

    /// @notice Recjet offer and return amount .
    /// @param itemId  which record.
    /// @param nftAddress address of the contract which you want to listed
    function rejectOffer(uint256 itemId, address nftAddress)
        public
        payable
        nonReentrant
        isListed(nftAddress, itemId)
    {
        IERC721 nft = IERC721(nftAddress);

        MarketItem storage item = checkRequirmentMarketPlace(itemId, nftAddress, nft); // check basic the requirement
        if (item.expiresAt < (block.timestamp + 40)) {
            // check listed item not expired
            revert PTNFTMarketPlace__MarketItemExpired();
        }
        if (item.seller != msg.sender) revert PTNFTMarketPlace__NotOwner(); // check owner
        Offer memory offer = getMarketOffer(nftAddress, item.tokenId); //get offer
        if (offer.startAt <= 0) {
            revert PTNFTMarketPlace__NoOfferExist();
        }
        if (offer.expiresAt < (block.timestamp + 40)) {
            revert PTNFTMarketPlace__OfferTimeExpired();
        }
        s_amounts[offer.offerBy] += (offer.offerAmount);

        delete s_marketOffers[nftAddress][item.tokenId];
        emit RejectOffer(
            offer.tokenId,
            item.seller,
            nftAddress,
            offer.offerAmount,
            offer.offerBy,
            offer.status
        );
    }

    /// @notice Accepte the offer on which you are willing to sale .
    /// @param itemId  which record.
    /// @param nftAddress address of the contract which you want to listed

    function acceptOffer(uint256 itemId, address nftAddress)
        public
        payable
        nonReentrant
        isListed(nftAddress, itemId)
    {
        IERC721 nft = IERC721(nftAddress);

        MarketItem storage item = checkRequirmentMarketPlace(itemId, nftAddress, nft); // check basic check on marketplace

        if (item.expiresAt < (block.timestamp + 40)) {
            // item not expired
            revert PTNFTMarketPlace__MarketItemExpired();
        }
        if (item.seller != msg.sender) revert PTNFTMarketPlace__NotOwner(); // only owner
        Offer memory offer = getMarketOffer(nftAddress, item.tokenId);
        // checkERC20Requirment(offer.offerAmount, offer.offerBy, item.pid);

        if (offer.startAt <= 0) {
            // isOffer exist
            revert PTNFTMarketPlace__NoOfferExist();
        }
        if (offer.expiresAt < (block.timestamp + 40)) {
            //check expired time
            revert PTNFTMarketPlace__OfferTimeExpired();
        }
        item.buyer = payable(offer.offerBy); // transfer the NFT to new owner
        item.state = State.Release;
        s_amounts[i_marketowner] += getPercentage(offer.offerAmount); //calculate marketplace fee
        s_amounts[item.seller] += (offer.offerAmount - getPercentage(offer.offerAmount)); // calculate owner amount after minus the fee
        delete s_marketOffers[nftAddress][item.tokenId];
        // s_marketOffers[nftAddress][item.tokenId].status = OfferState.CLOSE;
        nft.transferFrom(item.seller, offer.offerBy, item.tokenId);
        _itemSoldCounter.increment();
        emit TotalNumberOfItemMarketPlace(_itemSoldCounter.current());

        emit AcceptOffer(
            offer.tokenId,
            item.seller,
            nftAddress,
            offer.offerAmount,
            offer.offerBy,
            offer.status
        );
    }

    /// @notice checkRequirmentMarketPlace  this function will check the basic check. .
    /// @param itemId  which record.
    /// @param nftAddress   address to get which record
    /// @param nft   contract object
    function checkRequirmentMarketPlace(
        uint256 itemId,
        address nftAddress,
        IERC721 nft
    ) internal view returns (MarketItem storage) {
        MarketItem storage item = s_marketItems[nftAddress][itemId]; //should use storge!!!!
        if (item.state != State.Created) revert PTNFTMarketPlace__NotAvailableForOffer(); // Listed item should be active
        if (nft.getApproved(item.tokenId) != address(this))
            // Marketplace approve for transfer it
            revert PTNFTMarketPlace__PermissionRequired();

        return item;
    }

    /// @notice This function will basic check on ERC20
    /// @param newOfferAmount  item expired or not.
    /// @param pid  older offer amount is greater or less the new one.
    function checkERC20Requirment(
        uint256 newOfferAmount,
        address userAddress,
        uint256 pid
    ) internal view {
        if ((AllowedCrypto.length.sub(1)) < pid) revert PTNFTMarketPlace__AllowedCryptoNotExist();
        if (AllowedCrypto[pid].allowance(address(this), userAddress) == 0)
            revert PTNFTMarketPlace__PermissionRequired();
        if (AllowedCrypto[pid].allowance(address(this), userAddress) < newOfferAmount)
            revert PTNFTMarketPlace__InsufficientApprovalFund();
    }

    /// @notice this is an helper function optimize the code .
    /// @param expiresAt  item expired or not.
    /// @param offerAmount  older offer amount is greater or less the new one.
    /// @param minPrice  does it more then min price.
    function checkRequirment(
        OfferState status,
        uint256 expiresAt,
        uint256 offerAmount,
        uint256 minPrice,
        uint256 newOfferAmount
    ) internal view {
        if (status != OfferState.OPEN) {
            revert PTNFTMarketPlace__NotAvailableForOffer();
        }
        if (minPrice > newOfferAmount) {
            revert PTNFTMarketPlace__InsufficientFund();
        }
        if (expiresAt > (block.timestamp + 40) && offerAmount > newOfferAmount) {
            revert PTNFTMarketPlace__InsufficientFund();
        }
    }

    /// @notice this is used to update offer values and optimize the code.
    /// @param tokenId  NFT Id
    /// @param value  new offer value
    /// @param offer  offer object.
    /// @param sender  offer by.
    /// @param numberOfDays  offer valid for how many days.

    function setOfferStruct(
        Offer memory offer,
        uint256 tokenId,
        uint256 value,
        address sender,
        uint256 numberOfDays
    ) internal view returns (Offer memory) {
        offer.tokenId = tokenId;
        offer.offerAmount = value;
        offer.totalOffers++;
        offer.startAt = block.timestamp;
        offer.expiresAt = block.timestamp + (numberOfDays * 1 days); // calculate the number of day into epoc time
        offer.offerBy = payable(sender);
        offer.status = OfferState.OPEN;
        return offer;
    }

    /// @notice this allow Buyer to withdraw from their offer and get back it amount .
    /// @param tokenId  which NFT.
    /// @param nftAddress   contract address
    function withDrawOfferFromLazzMint(
        address nftAddress,
        uint256 tokenId,
        uint256 pid
    ) public payable nonReentrant {
        Offer memory offer = getOffer(nftAddress, tokenId);
        // if()
        if (offer.startAt <= 0) {
            // isOffer exist
            revert PTNFTMarketPlace__NoOfferExist();
        }
        if (offer.offerBy != msg.sender) revert PTNFTMarketPlace__PermissionRequired();
        delete s_offers[nftAddress][tokenId];
        AllowedCrypto[pid].transfer(msg.sender, offer.offerAmount);
        // (bool success, ) = offer.offerBy.call{value: offer.offerAmount}("");
        // if (!success) {
        //     revert PTNFTMarketPlace__FailToWithDrawAmount();
        // }
        emit WithDrawFromOffer(offer.tokenId, nftAddress, offer.offerAmount, offer.offerBy);
    }

    /// @notice this allow Buyer to withdraw from their offer and get back it amount .
    /// @param tokenId  which NFT.
    /// @param nftAddress   contract address

    function withDrawOfferFromMarket(address nftAddress, uint256 tokenId)
        public
        payable
        nonReentrant
    {
        Offer memory offer = getMarketOffer(nftAddress, tokenId);
        // if()
        if (offer.startAt <= 0) {
            // isOffer exist
            revert PTNFTMarketPlace__NoOfferExist();
        }
        if (offer.offerBy != msg.sender) revert PTNFTMarketPlace__PermissionRequired();
        delete s_marketOffers[nftAddress][tokenId];
        (bool success, ) = offer.offerBy.call{value: offer.offerAmount}("");
        if (!success) {
            revert PTNFTMarketPlace__FailToWithDrawAmount();
        }
        emit WithDrawFromOffer(offer.tokenId, nftAddress, offer.offerAmount, offer.offerBy);
    }

    /// @notice this allow Buyer whose offer is expire or over by other buyer .
    function withDrawAmount() public payable nonReentrant {
        uint256 amount = s_amounts[msg.sender];
        if (amount == 0) revert PTNFTMarketPlace__NoAmountForWithDraw();
        s_amounts[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert PTNFTMarketPlace__FailToWithDrawAmount();
        }
        emit WithDrawAmount(msg.sender, amount);
    }

    function addCurrency(IERC20 _paytoken) public onlyMarketplaceOwner {
        AllowedCrypto.push(_paytoken);
    }

    //// private
    //// view / pure
    function getListingFee() public view returns (uint256) {
        return s_listingFee;
    }

    /// @notice it will return percentage of profite transfer to market place owner .

    function getPercentage(uint256 amount) internal view returns (uint256) {
        return (s_listingFee * amount) / 1000;
    }

    function getContractBlanace() public view returns (uint256) {
        return address(this).balance;
    }

    // function getOffer(uint256 tokenId) public view returns (Offer memory) {
    //     return s_offers[tokenId];
    // }

    function getMarketOffer(address nftAddress, uint256 tokenId)
        public
        view
        returns (Offer memory)
    {
        return s_marketOffers[nftAddress][tokenId];
    }

    function getOffer(address nftAddress, uint256 tokenId) public view returns (Offer memory) {
        return s_offers[nftAddress][tokenId];
    }

    function getWithDrawAmounts(address buyer) public view returns (uint256) {
        return s_amounts[buyer];
    }

    function getItemCounter() public view returns (uint256) {
        return _itemCounter.current();
    }

    function setNftContractAddress(address nftContractAddress) public onlyMarketplaceOwner {
        if (nftContractAddress == address(0))
            revert PTNFTMarketPlace__NFTContractAddressIsRequired();

        s_nftContractAddress = nftContractAddress;
    }

    function getNftContractAddress() public view returns (address) {
        return s_nftContractAddress;
    }

    function getMarketItem(address nftAddress, uint256 tokenId)
        external
        view
        returns (MarketItem memory)
    {
        return s_marketItems[nftAddress][tokenId];
    }

    /// @notice it is percentage of profite fee charge by marketplace on sale it should be one decimal number 1.2 = 12, 2.6 =26 ,100=10   .
    // it will not more the 10 percentage
    function setlistingFee(uint256 listingFee) public onlyMarketplaceOwner {
        if (listingFee <= 0) revert PTNFTMarketPlace__ValueShouldGreaterThenZero();
        s_listingFee = listingFee;
    }

    function getMarketowner() public view returns (address) {
        return i_marketowner;
    }
}
