using Microsoft.EntityFrameworkCore;
using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Company> Companies { get; }
    DbSet<User> Users { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<Supplier> Suppliers { get; }
    DbSet<SupplierDocument> SupplierDocuments { get; }
    DbSet<SupplierDocumentReview> SupplierDocumentReviews { get; }
    DbSet<CompanySupplier> CompanySuppliers { get; }
    DbSet<ContractingMode> ContractingModes { get; }
    DbSet<ApprovalWorkflow> ApprovalWorkflows { get; }
    DbSet<ApprovalWorkflowLevel> ApprovalWorkflowLevels { get; }
    DbSet<DocumentTemplate> DocumentTemplates { get; }
    DbSet<CompanyConfiguration> CompanyConfigurations { get; }
    DbSet<PurchaseProcess> PurchaseProcesses { get; }
    DbSet<PurchaseItem> PurchaseItems { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<Auction> Auctions { get; }
    DbSet<AuctionParticipant> AuctionParticipants { get; }
    DbSet<Bid> Bids { get; }
    DbSet<Evaluation> Evaluations { get; }
    DbSet<Award> Awards { get; }
    DbSet<AwardItem> AwardItems { get; }
    DbSet<Approval> Approvals { get; }
    DbSet<Contract> Contracts { get; }
    DbSet<PurchaseOrder> PurchaseOrders { get; }
    DbSet<ReceptionConfirmation> ReceptionConfirmations { get; }
    DbSet<ReceptionConfirmationItem> ReceptionConfirmationItems { get; }
    DbSet<AuditEvent> AuditEvents { get; }
    DbSet<AccessLog> AccessLogs { get; }
    DbSet<EvaluationCriterion> EvaluationCriteria { get; }
    DbSet<SupplierEvaluation> SupplierEvaluations { get; }
    DbSet<SupplierCriterionResult> SupplierCriterionResults { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
