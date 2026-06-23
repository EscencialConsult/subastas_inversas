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
    DbSet<CompanySupplier> CompanySuppliers { get; }
    DbSet<ContractingMode> ContractingModes { get; }
    DbSet<ApprovalWorkflow> ApprovalWorkflows { get; }
    DbSet<CompanyConfiguration> CompanyConfigurations { get; }
    DbSet<PurchaseProcess> PurchaseProcesses { get; }
    DbSet<PurchaseItem> PurchaseItems { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<Auction> Auctions { get; }
    DbSet<AuctionParticipant> AuctionParticipants { get; }
    DbSet<Bid> Bids { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
