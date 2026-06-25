using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DocumentTemplateId",
                table: "PurchaseOrders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DocumentTemplateId",
                table: "Contracts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DocumentTemplateId",
                table: "Awards",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DocumentTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "character varying(12000)", maxLength: 12000, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentTemplates_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_DocumentTemplateId",
                table: "PurchaseOrders",
                column: "DocumentTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_DocumentTemplateId",
                table: "Contracts",
                column: "DocumentTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_Awards_DocumentTemplateId",
                table: "Awards",
                column: "DocumentTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentTemplates_CompanyId_Type_Active",
                table: "DocumentTemplates",
                columns: new[] { "CompanyId", "Type", "Active" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentTemplates_CompanyId_Type_Version",
                table: "DocumentTemplates",
                columns: new[] { "CompanyId", "Type", "Version" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Awards_DocumentTemplates_DocumentTemplateId",
                table: "Awards",
                column: "DocumentTemplateId",
                principalTable: "DocumentTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Contracts_DocumentTemplates_DocumentTemplateId",
                table: "Contracts",
                column: "DocumentTemplateId",
                principalTable: "DocumentTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_DocumentTemplates_DocumentTemplateId",
                table: "PurchaseOrders",
                column: "DocumentTemplateId",
                principalTable: "DocumentTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Awards_DocumentTemplates_DocumentTemplateId",
                table: "Awards");

            migrationBuilder.DropForeignKey(
                name: "FK_Contracts_DocumentTemplates_DocumentTemplateId",
                table: "Contracts");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_DocumentTemplates_DocumentTemplateId",
                table: "PurchaseOrders");

            migrationBuilder.DropTable(
                name: "DocumentTemplates");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_DocumentTemplateId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Contracts_DocumentTemplateId",
                table: "Contracts");

            migrationBuilder.DropIndex(
                name: "IX_Awards_DocumentTemplateId",
                table: "Awards");

            migrationBuilder.DropColumn(
                name: "DocumentTemplateId",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "DocumentTemplateId",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "DocumentTemplateId",
                table: "Awards");
        }
    }
}
