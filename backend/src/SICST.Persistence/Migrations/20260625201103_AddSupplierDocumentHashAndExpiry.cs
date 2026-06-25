using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierDocumentHashAndExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SupplierDocuments_SupplierId",
                table: "SupplierDocuments");

            migrationBuilder.AddColumn<DateTime>(
                name: "AlertSentAtUtc",
                table: "SupplierDocuments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAtUtc",
                table: "SupplierDocuments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Sha256Hash",
                table: "SupplierDocuments",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "0000000000000000000000000000000000000000000000000000000000000000");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "SupplierDocuments",
                type: "text",
                nullable: false,
                defaultValue: "Expired");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocuments_ExpiresAtUtc",
                table: "SupplierDocuments",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocuments_Status",
                table: "SupplierDocuments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocuments_SupplierId_Sha256Hash",
                table: "SupplierDocuments",
                columns: new[] { "SupplierId", "Sha256Hash" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SupplierDocuments_ExpiresAtUtc",
                table: "SupplierDocuments");

            migrationBuilder.DropIndex(
                name: "IX_SupplierDocuments_Status",
                table: "SupplierDocuments");

            migrationBuilder.DropIndex(
                name: "IX_SupplierDocuments_SupplierId_Sha256Hash",
                table: "SupplierDocuments");

            migrationBuilder.DropColumn(
                name: "AlertSentAtUtc",
                table: "SupplierDocuments");

            migrationBuilder.DropColumn(
                name: "ExpiresAtUtc",
                table: "SupplierDocuments");

            migrationBuilder.DropColumn(
                name: "Sha256Hash",
                table: "SupplierDocuments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "SupplierDocuments");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocuments_SupplierId",
                table: "SupplierDocuments",
                column: "SupplierId");
        }
    }
}
