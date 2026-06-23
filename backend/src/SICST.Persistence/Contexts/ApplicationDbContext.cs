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

        base.OnModelCreating(modelBuilder);
    }
}
