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
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplierDocument> SupplierDocuments => Set<SupplierDocument>();
    public DbSet<CompanySupplier> CompanySuppliers => Set<CompanySupplier>();
    public DbSet<ContractingMode> ContractingModes => Set<ContractingMode>();
    public DbSet<ApprovalWorkflow> ApprovalWorkflows => Set<ApprovalWorkflow>();
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

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = ChangeTracker.Entries()
            .Where(entry =>
                entry.Entity is not AuditEvent &&
                entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
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
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        
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
            entity.Property(e => e.Province).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Locality).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.ArcaVerified).IsRequired();
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

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CompanySupplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.SupplierId }).IsUnique();
            entity.Property(e => e.LinkedAtUtc).IsRequired();

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
            entity.Property(e => e.RequiresAuction).IsRequired();
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

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

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany()
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
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
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.PlacedAtUtc).IsRequired();

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
