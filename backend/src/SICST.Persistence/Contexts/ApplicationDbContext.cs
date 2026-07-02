using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Persistence.Contexts;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    private readonly ICurrentTenant _currentTenant;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentTenant currentTenant)
        : base(options)
    {
        _currentTenant = currentTenant;
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplierDocument> SupplierDocuments => Set<SupplierDocument>();
    public DbSet<SupplierDocumentReview> SupplierDocumentReviews => Set<SupplierDocumentReview>();
    public DbSet<CompanySupplier> CompanySuppliers => Set<CompanySupplier>();
    public DbSet<ContractingMode> ContractingModes => Set<ContractingMode>();
    public DbSet<ApprovalWorkflow> ApprovalWorkflows => Set<ApprovalWorkflow>();
    public DbSet<ApprovalWorkflowLevel> ApprovalWorkflowLevels => Set<ApprovalWorkflowLevel>();
    public DbSet<DocumentTemplate> DocumentTemplates => Set<DocumentTemplate>();
    public DbSet<CompanyConfiguration> CompanyConfigurations => Set<CompanyConfiguration>();
    public DbSet<PurchaseProcess> PurchaseProcesses => Set<PurchaseProcess>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<Auction> Auctions => Set<Auction>();
    public DbSet<AuctionParticipant> AuctionParticipants => Set<AuctionParticipant>();
    public DbSet<Bid> Bids => Set<Bid>();
    public DbSet<Evaluation> Evaluations => Set<Evaluation>();
    public DbSet<Award> Awards => Set<Award>();
    public DbSet<AwardItem> AwardItems => Set<AwardItem>();
    public DbSet<Approval> Approvals => Set<Approval>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<ContractPayment> ContractPayments => Set<ContractPayment>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<ReceptionConfirmation> ReceptionConfirmations => Set<ReceptionConfirmation>();
    public DbSet<ReceptionConfirmationItem> ReceptionConfirmationItems => Set<ReceptionConfirmationItem>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<AccessLog> AccessLogs => Set<AccessLog>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<EvaluationCriterion> EvaluationCriteria => Set<EvaluationCriterion>();
    public DbSet<SupplierEvaluation> SupplierEvaluations => Set<SupplierEvaluation>();
    public DbSet<SupplierCriterionResult> SupplierCriterionResults => Set<SupplierCriterionResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Configuracion de filtros globales multiempresa
        modelBuilder.Entity<User>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<CompanySupplier>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<ContractingMode>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<ApprovalWorkflow>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<DocumentTemplate>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<CompanyConfiguration>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<PurchaseProcess>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<Auction>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<AuditEvent>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<Contract>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<ContractPayment>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<AccessLog>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);

        base.OnModelCreating(modelBuilder);
    }
}
