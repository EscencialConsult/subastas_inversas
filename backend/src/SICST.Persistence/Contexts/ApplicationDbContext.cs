using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Persistence.Contexts;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    private static readonly HashSet<string> SensitiveAuditProperties =
    [
        nameof(User.PasswordHash),
        nameof(User.MfaSecret),
        nameof(User.RefreshTokenHash),
        nameof(User.RefreshTokenExpiresAtUtc)
    ];

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
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<ReceptionConfirmation> ReceptionConfirmations => Set<ReceptionConfirmation>();
    public DbSet<ReceptionConfirmationItem> ReceptionConfirmationItems => Set<ReceptionConfirmationItem>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<AccessLog> AccessLogs => Set<AccessLog>();
    public DbSet<EvaluationCriterion> EvaluationCriteria => Set<EvaluationCriterion>();
    public DbSet<SupplierEvaluation> SupplierEvaluations => Set<SupplierEvaluation>();
    public DbSet<SupplierCriterionResult> SupplierCriterionResults => Set<SupplierCriterionResult>();

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (ChangeTracker.Entries<Award>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted &&
                !string.IsNullOrWhiteSpace(entry.Entity.ImmutableHash)))
        {
            throw new InvalidOperationException("Las adjudicaciones registradas son inmutables.");
        }

        if (ChangeTracker.Entries<AwardItem>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Los items de adjudicacion registrados son inmutables.");
        }

        if (ChangeTracker.Entries<SupplierDocumentReview>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Los dictamenes y revisiones documentales son inmutables.");
        }

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                var companyIdProp = entry.Entity.GetType().GetProperty("CompanyId");
                if (companyIdProp != null && companyIdProp.CanWrite)
                {
                    var currentValue = companyIdProp.GetValue(entry.Entity) as Guid?;
                    if ((currentValue == null || currentValue == Guid.Empty) && _currentTenant.CompanyId.HasValue)
                    {
                        companyIdProp.SetValue(entry.Entity, _currentTenant.CompanyId.Value);
                    }
                }
            }
        }

        var auditEntries = ChangeTracker.Entries()
            .Where(entry =>
                entry.Entity is not AuditEvent &&
                entry.Entity is not AccessLog &&
                entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted &&
                HasAuditableChanges(entry))
            .Select(CreatePendingAuditEvent)
            .ToList();

        if (auditEntries.Count > 0)
        {
            var lastAudit = await AuditEvents
                .OrderByDescending(e => e.Sequence)
                .FirstOrDefaultAsync(cancellationToken);

            var sequence = lastAudit?.Sequence ?? 0;
            var previousHash = lastAudit?.Hash ?? string.Empty;
            var now = DateTime.UtcNow;

            foreach (var auditEntry in auditEntries)
            {
                sequence++;
                auditEntry.Id = Guid.NewGuid();
                auditEntry.Sequence = sequence;
                auditEntry.CreatedAtUtc = now;
                auditEntry.PreviousHash = previousHash;
                auditEntry.Hash = ComputeHash(auditEntry);
                previousHash = auditEntry.Hash;
                AuditEvents.Add(auditEntry);
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Define simple constraints for Company
        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Domain).IsUnique();
            entity.Property(e => e.Domain).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Logo).HasMaxLength(500);
            entity.Property(e => e.PrimaryColor).HasMaxLength(20);
        });

        // Define constraints for User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.MfaEnabled).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.MfaSecret).HasMaxLength(128);
            entity.Property(e => e.RefreshTokenHash).HasMaxLength(256);
            entity.Property(e => e.RefreshTokenExpiresAtUtc);
            
            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(250);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Role, e.PermissionId }).IsUnique();

            entity.HasOne(e => e.Permission)
                .WithMany()
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Cuit).IsUnique();
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.Cuit).IsRequired().HasMaxLength(13);
            entity.Property(e => e.BusinessName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.BusinessCategory).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Province).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Locality).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.BusinessCategory);
            entity.HasIndex(e => new { e.Province, e.Locality });
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.ArcaVerified).IsRequired();
            entity.Property(e => e.ArcaVerificationStatus).IsRequired();
            entity.Property(e => e.ArcaVerificationNotes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<Supplier>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SupplierDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.StoragePath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.UploadedAtUtc).IsRequired();
            entity.Property(e => e.Sha256Hash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.ExpiresAtUtc).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.AlertSentAtUtc);
            entity.HasIndex(e => new { e.SupplierId, e.Sha256Hash });
            entity.HasIndex(e => e.ExpiresAtUtc);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SupplierDocumentReview>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SupplierDocumentId);
            entity.HasIndex(e => new { e.SupplierDocumentId, e.Action });
            entity.Property(e => e.Action).IsRequired().HasConversion<string>();
            entity.Property(e => e.Verdict).HasConversion<string>();
            entity.Property(e => e.Notes).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.ExceptionReason).HasMaxLength(2000);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.SupplierDocument)
                .WithMany(e => e.Reviews)
                .HasForeignKey(e => e.SupplierDocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Reviewer)
                .WithMany()
                .HasForeignKey(e => e.ReviewerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CompanySupplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.SupplierId }).IsUnique();
            entity.Property(e => e.LinkedAtUtc).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.WarningMessage).HasMaxLength(500);
            entity.Property(e => e.EvaluatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContractingMode>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.Name }).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.MinAmount).HasPrecision(18, 2);
            entity.Property(e => e.MaxAmount).HasPrecision(18, 2);
            entity.Property(e => e.RequiresAuction).IsRequired();
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.HasIndex(e => new { e.CompanyId, e.MinAmount, e.MaxAmount });

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApprovalWorkflow>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.Name }).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.Property(e => e.MinAmount).HasPrecision(18, 2);
            entity.Property(e => e.MaxAmount).HasPrecision(18, 2);
            entity.Property(e => e.RequiredRole).IsRequired();
            entity.Property(e => e.RequiredApprovals).IsRequired();
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApprovalWorkflowLevel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ApprovalWorkflowId, e.LevelOrder }).IsUnique();
            entity.Property(e => e.LevelOrder).IsRequired();
            entity.Property(e => e.RequiredRole).IsRequired();
            entity.Property(e => e.AmountThreshold).HasPrecision(18, 2);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.ApprovalWorkflow)
                .WithMany(e => e.Levels)
                .HasForeignKey(e => e.ApprovalWorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CompanyConfiguration>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CompanyId).IsUnique();
            entity.Property(e => e.DefaultCurrency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.TimeZone).IsRequired().HasMaxLength(100);
            entity.Property(e => e.MinimumBidDecrementPercentage).HasPrecision(5, 2);
            entity.Property(e => e.AuctionExtensionMinutes).IsRequired();
            entity.Property(e => e.RequireSupplierVerification).IsRequired();
            entity.Property(e => e.UpdatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DocumentTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.Type, e.Version }).IsUnique();
            entity.HasIndex(e => new { e.CompanyId, e.Type, e.Active });
            entity.Property(e => e.Type).IsRequired().HasConversion<string>();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Version).IsRequired();
            entity.Property(e => e.Content).IsRequired().HasMaxLength(12000);
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PurchaseProcess>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.Code }).IsUnique();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.EstimatedBudget).HasPrecision(18, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.SpecificationsHash).HasMaxLength(64);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Buyer)
                .WithMany()
                .HasForeignKey(e => e.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ContractingMode)
                .WithMany()
                .HasForeignKey(e => e.ContractingModeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PurchaseItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Quantity).HasPrecision(18, 2);
            entity.Property(e => e.Unit).IsRequired().HasMaxLength(50);
            entity.Property(e => e.EstimatedUnitPrice).HasPrecision(18, 2);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseProcessId, e.SupplierId }).IsUnique();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.InvitedAtUtc).IsRequired();
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.QualificationNotes).HasMaxLength(1000);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany()
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Auction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PurchaseProcessId).IsUnique();
            entity.Property(e => e.BasePrice).HasPrecision(18, 2);
            entity.Property(e => e.MinimumDecrementPercentage).HasPrecision(5, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.StartsAtUtc).IsRequired();
            entity.Property(e => e.EndsAtUtc).IsRequired();
            entity.Property(e => e.AutoExtensionMinutes).IsRequired().HasDefaultValue(3);
            entity.Property(e => e.PabThreshold).HasPrecision(18, 2);
            entity.Property(e => e.ClosingActHash).HasMaxLength(64);
            entity.Property(e => e.ClosingActPath).HasMaxLength(500);
            entity.Property(e => e.SavingsAmount).HasPrecision(18, 2);
            entity.Property(e => e.SavingsPercentage).HasPrecision(5, 2);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany()
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuctionParticipant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AuctionId, e.SupplierId }).IsUnique();
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.JoinedAtUtc).IsRequired();

            entity.HasOne(e => e.Auction)
                .WithMany(e => e.Participants)
                .HasForeignKey(e => e.AuctionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Bid>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AuctionId, e.PlacedAtUtc });
            entity.HasIndex(e => new { e.AuctionId, e.SequenceNumber }).IsUnique();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.PlacedAtUtc).IsRequired();
            entity.Property(e => e.IsPab).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.SequenceNumber).IsRequired();
            entity.Property(e => e.PreviousHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Hash).IsRequired().HasMaxLength(64);

            entity.HasOne(e => e.Auction)
                .WithMany(e => e.Bids)
                .HasForeignKey(e => e.AuctionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Evaluation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PurchaseProcessId).IsUnique();
            entity.Property(e => e.RecommendedSupplier).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithOne(p => p.Evaluation)
                .HasForeignKey<Evaluation>(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Evaluator)
                .WithMany()
                .HasForeignKey(e => e.EvaluatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Award>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseProcessId, e.SupplierId }).IsUnique();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.DocumentHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.ImmutableHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.AdjudicatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.Awards)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AdjudicatedBy)
                .WithMany()
                .HasForeignKey(e => e.AdjudicatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DocumentTemplate)
                .WithMany()
                .HasForeignKey(e => e.DocumentTemplateId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AwardItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AwardId, e.PurchaseItemId }).IsUnique();
            entity.Property(e => e.Quantity).HasPrecision(18, 2);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);

            entity.HasOne(e => e.Award)
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.AwardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseItem)
                .WithMany()
                .HasForeignKey(e => e.PurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Approval>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comments).HasMaxLength(2000);
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany()
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Approver)
                .WithMany()
                .HasForeignKey(e => e.ApproverId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovalWorkflowLevel)
                .WithMany()
                .HasForeignKey(e => e.ApprovalWorkflowLevelId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Contract>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AwardId).IsUnique();
            entity.HasIndex(e => e.PurchaseProcessId);
            entity.HasIndex(e => new { e.CompanyId, e.Number }).IsUnique();
            entity.Property(e => e.Number).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.StartDateUtc).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.Terms).HasMaxLength(4000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.Contracts)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Award)
                .WithOne(a => a.Contract)
                .HasForeignKey<Contract>(e => e.AwardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DocumentTemplate)
                .WithMany()
                .HasForeignKey(e => e.DocumentTemplateId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.SignedByOperator)
                .WithMany()
                .HasForeignKey(e => e.SignedByOperatorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(e => e.SignatureHash).HasMaxLength(64);
        });

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ContractId).IsUnique();
            entity.HasIndex(e => e.PurchaseProcessId);
            entity.HasIndex(e => new { e.CompanyId, e.Number }).IsUnique();
            entity.Property(e => e.Number).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.IssuedAtUtc).IsRequired();
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.PurchaseOrders)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Contract)
                .WithOne(c => c.PurchaseOrder)
                .HasForeignKey<PurchaseOrder>(e => e.ContractId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DocumentTemplate)
                .WithMany()
                .HasForeignKey(e => e.DocumentTemplateId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ReceptionConfirmation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseOrderId, e.ReceivedAtUtc });
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.ReceivedAtUtc).IsRequired();
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.PurchaseOrder)
                .WithMany(e => e.Receptions)
                .HasForeignKey(e => e.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ReceivedBy)
                .WithMany()
                .HasForeignKey(e => e.ReceivedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReceptionConfirmationItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ReceptionConfirmationId, e.PurchaseItemId }).IsUnique();
            entity.Property(e => e.QuantityReceived).HasPrecision(18, 2);

            entity.HasOne(e => e.ReceptionConfirmation)
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.ReceptionConfirmationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseItem)
                .WithMany()
                .HasForeignKey(e => e.PurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Sequence).IsUnique();
            entity.HasIndex(e => e.CompanyId);
            entity.HasIndex(e => new { e.EntityName, e.EntityId });
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.EntityId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Action).IsRequired().HasConversion<string>();
            entity.Property(e => e.Payload).IsRequired().HasColumnType("jsonb");
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.PreviousHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Hash).IsRequired().HasMaxLength(64);
        });

        modelBuilder.Entity<AccessLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CompanyId);
            entity.HasIndex(e => e.OccurredAtUtc);
            entity.HasIndex(e => new { e.Email, e.OccurredAtUtc });
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.EventType).IsRequired().HasConversion<string>();
            entity.Property(e => e.Success).IsRequired();
            entity.Property(e => e.FailureReason).HasMaxLength(300);
            entity.Property(e => e.IpAddress).HasMaxLength(80);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.OccurredAtUtc).IsRequired();
        });

        modelBuilder.Entity<EvaluationCriterion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseProcessId, e.Name }).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Weight).HasPrecision(5, 2);
            entity.Property(e => e.SortOrder).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.EvaluationCriteria)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SupplierEvaluation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseProcessId, e.SupplierId }).IsUnique();
            entity.Property(e => e.TotalWeightedScore).HasPrecision(5, 2);
            entity.Property(e => e.ExcludedReason).HasMaxLength(500);
            entity.Property(e => e.EvaluatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.SupplierEvaluations)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EvaluatedBy)
                .WithMany()
                .HasForeignKey(e => e.EvaluatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SupplierCriterionResult>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SupplierEvaluationId, e.EvaluationCriterionId }).IsUnique();
            entity.Property(e => e.Score).HasPrecision(5, 2);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasOne(e => e.SupplierEvaluation)
                .WithMany(e => e.CriterionResults)
                .HasForeignKey(e => e.SupplierEvaluationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.EvaluationCriterion)
                .WithMany()
                .HasForeignKey(e => e.EvaluationCriterionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configuración de Filtros Globales Multiempresa
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
        modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);
        modelBuilder.Entity<AccessLog>().HasQueryFilter(e => _currentTenant.CompanyId == null || e.CompanyId == _currentTenant.CompanyId);

        base.OnModelCreating(modelBuilder);
    }

    private static AuditEvent CreatePendingAuditEvent(EntityEntry entry)
    {
        return new AuditEvent
        {
            CompanyId = TryGetGuid(entry, "CompanyId"),
            EntityName = entry.Metadata.ClrType.Name,
            EntityId = ResolveEntityId(entry),
            Action = entry.State switch
            {
                EntityState.Added => AuditEventAction.Created,
                EntityState.Modified => AuditEventAction.Updated,
                EntityState.Deleted => AuditEventAction.Deleted,
                _ => AuditEventAction.Updated
            },
            Payload = BuildPayload(entry)
        };
    }

    private static bool HasAuditableChanges(EntityEntry entry)
    {
        if (entry.State != EntityState.Modified)
        {
            return true;
        }

        return entry.Properties.Any(p => p.IsModified && !SensitiveAuditProperties.Contains(p.Metadata.Name));
    }

    private static string ResolveEntityId(EntityEntry entry)
    {
        var id = TryGetValue(entry, "Id");
        return id?.ToString() ?? string.Empty;
    }

    private static Guid? TryGetGuid(EntityEntry entry, string propertyName)
    {
        var value = TryGetValue(entry, propertyName);
        return value is Guid guid ? guid : null;
    }

    private static object? TryGetValue(EntityEntry entry, string propertyName)
    {
        var property = entry.Properties.FirstOrDefault(p => p.Metadata.Name == propertyName);
        if (property == null)
        {
            return null;
        }

        return entry.State == EntityState.Deleted ? property.OriginalValue : property.CurrentValue;
    }

    private static string BuildPayload(EntityEntry entry)
    {
        var values = new SortedDictionary<string, object?>();

        foreach (var property in entry.Properties.OrderBy(p => p.Metadata.Name))
        {
            if (SensitiveAuditProperties.Contains(property.Metadata.Name))
            {
                continue;
            }

            if (entry.State == EntityState.Modified && !property.IsModified)
            {
                continue;
            }

            values[property.Metadata.Name] = entry.State switch
            {
                EntityState.Deleted => property.OriginalValue,
                EntityState.Modified => new
                {
                    before = property.OriginalValue,
                    after = property.CurrentValue
                },
                _ => property.CurrentValue
            };
        }

        return JsonSerializer.Serialize(values);
    }

    private static string ComputeHash(AuditEvent auditEvent)
    {
        var material = string.Join("|",
            auditEvent.Sequence,
            auditEvent.PreviousHash,
            auditEvent.CompanyId?.ToString() ?? string.Empty,
            auditEvent.EntityName,
            auditEvent.EntityId,
            auditEvent.Action,
            auditEvent.CreatedAtUtc.ToString("O"),
            auditEvent.Payload);

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
