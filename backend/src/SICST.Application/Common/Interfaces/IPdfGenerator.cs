using System.Collections.Generic;
using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface IPdfGenerator
{
    string GenerateAwardAct(PurchaseProcess process, Award award, Supplier supplier, User approver, List<Bid> bids);
    string GenerateContract(PurchaseProcess process, Contract contract, Supplier supplier);
    string GeneratePurchaseOrder(PurchaseProcess process, PurchaseOrder order, Supplier supplier);
    string GenerateReceptionConfirmation(PurchaseOrder order, ReceptionConfirmation reception);
}
