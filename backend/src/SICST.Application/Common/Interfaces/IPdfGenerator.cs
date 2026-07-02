using SICST.Application.Common.Security;
using System.Collections.Generic;
using SICST.Application.Modules.Auctions;
using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface IPdfGenerator
{
    string GenerateAwardAct(PurchaseProcess process, Award award, Supplier supplier, User approver, List<Bid> bids, DocumentTemplate? template = null);
    string GenerateContract(PurchaseProcess process, Contract contract, Supplier supplier, DocumentTemplate? template = null);
    string GeneratePurchaseOrder(PurchaseProcess process, PurchaseOrder order, Supplier supplier, DocumentTemplate? template = null);
    string GenerateReceptionConfirmation(PurchaseOrder order, ReceptionConfirmation reception);
    string GenerateEvaluationAct(PurchaseProcess process, List<Invitation> invitations, User evaluator, string hash, string signature, byte[]? signatureImageBytes);
    string GenerateAuctionClosingAct(Auction auction, string hash, List<AuctionComparisonRow> comparisonRows);
}
