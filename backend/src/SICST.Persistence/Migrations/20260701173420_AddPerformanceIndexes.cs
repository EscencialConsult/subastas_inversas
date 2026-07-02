using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Auctions_CompanyId",
                table: "Auctions");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Status",
                table: "Suppliers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseProcesses_CompanyId_Status_CreatedAtUtc",
                table: "PurchaseProcesses",
                columns: new[] { "CompanyId", "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseProcesses_CompanyId_Title",
                table: "PurchaseProcesses",
                columns: new[] { "CompanyId", "Title" });

            migrationBuilder.CreateIndex(
                name: "IX_Bids_AuctionId_Amount",
                table: "Bids",
                columns: new[] { "AuctionId", "Amount" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_CompanyId_Action_CreatedAtUtc",
                table: "AuditEvents",
                columns: new[] { "CompanyId", "Action", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_CompanyId_CreatedAtUtc",
                table: "AuditEvents",
                columns: new[] { "CompanyId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Auctions_CompanyId_ClosedAtUtc",
                table: "Auctions",
                columns: new[] { "CompanyId", "ClosedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Auctions_CompanyId_Status_EndsAtUtc",
                table: "Auctions",
                columns: new[] { "CompanyId", "Status", "EndsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AccessLogs_CompanyId_Success_OccurredAtUtc",
                table: "AccessLogs",
                columns: new[] { "CompanyId", "Success", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Suppliers_Status",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseProcesses_CompanyId_Status_CreatedAtUtc",
                table: "PurchaseProcesses");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseProcesses_CompanyId_Title",
                table: "PurchaseProcesses");

            migrationBuilder.DropIndex(
                name: "IX_Bids_AuctionId_Amount",
                table: "Bids");

            migrationBuilder.DropIndex(
                name: "IX_AuditEvents_CompanyId_Action_CreatedAtUtc",
                table: "AuditEvents");

            migrationBuilder.DropIndex(
                name: "IX_AuditEvents_CompanyId_CreatedAtUtc",
                table: "AuditEvents");

            migrationBuilder.DropIndex(
                name: "IX_Auctions_CompanyId_ClosedAtUtc",
                table: "Auctions");

            migrationBuilder.DropIndex(
                name: "IX_Auctions_CompanyId_Status_EndsAtUtc",
                table: "Auctions");

            migrationBuilder.DropIndex(
                name: "IX_AccessLogs_CompanyId_Success_OccurredAtUtc",
                table: "AccessLogs");

            migrationBuilder.CreateIndex(
                name: "IX_Auctions_CompanyId",
                table: "Auctions",
                column: "CompanyId");
        }
    }
}
