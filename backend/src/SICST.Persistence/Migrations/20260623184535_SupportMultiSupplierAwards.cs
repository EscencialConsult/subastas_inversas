using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SupportMultiSupplierAwards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_PurchaseProcessId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Contracts_PurchaseProcessId",
                table: "Contracts");

            migrationBuilder.DropIndex(
                name: "IX_Awards_PurchaseProcessId",
                table: "Awards");

            migrationBuilder.CreateTable(
                name: "AwardItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AwardItems_Awards_AwardId",
                        column: x => x.AwardId,
                        principalTable: "Awards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AwardItems_PurchaseItems_PurchaseItemId",
                        column: x => x.PurchaseItemId,
                        principalTable: "PurchaseItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_PurchaseProcessId",
                table: "PurchaseOrders",
                column: "PurchaseProcessId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_PurchaseProcessId",
                table: "Contracts",
                column: "PurchaseProcessId");

            migrationBuilder.CreateIndex(
                name: "IX_Awards_PurchaseProcessId_SupplierId",
                table: "Awards",
                columns: new[] { "PurchaseProcessId", "SupplierId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AwardItems_AwardId_PurchaseItemId",
                table: "AwardItems",
                columns: new[] { "AwardId", "PurchaseItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AwardItems_PurchaseItemId",
                table: "AwardItems",
                column: "PurchaseItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AwardItems");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_PurchaseProcessId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Contracts_PurchaseProcessId",
                table: "Contracts");

            migrationBuilder.DropIndex(
                name: "IX_Awards_PurchaseProcessId_SupplierId",
                table: "Awards");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_PurchaseProcessId",
                table: "PurchaseOrders",
                column: "PurchaseProcessId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_PurchaseProcessId",
                table: "Contracts",
                column: "PurchaseProcessId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Awards_PurchaseProcessId",
                table: "Awards",
                column: "PurchaseProcessId",
                unique: true);
        }
    }
}
