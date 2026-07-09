using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ArcaProfessionalization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ArcaBusinessNameMatchScore",
                table: "Suppliers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArcaLastRenewalAttemptAtUtc",
                table: "Suppliers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArcaVerificationExpiresAtUtc",
                table: "Suppliers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ArcaVerificationAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    Result = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BusinessNameMatchScore = table.Column<int>(type: "integer", nullable: true),
                    CuitConsulted = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: true),
                    BusinessNameDeclared = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BusinessNameFoundInArca = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RawResponseSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Automatic = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArcaVerificationAudits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArcaVerificationAudits_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArcaVerificationAudits_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArcaVerificationAudits_CreatedAtUtc",
                table: "ArcaVerificationAudits",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ArcaVerificationAudits_ReviewedByUserId",
                table: "ArcaVerificationAudits",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ArcaVerificationAudits_SupplierId",
                table: "ArcaVerificationAudits",
                column: "SupplierId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArcaVerificationAudits");

            migrationBuilder.DropColumn(
                name: "ArcaBusinessNameMatchScore",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaLastRenewalAttemptAtUtc",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaVerificationExpiresAtUtc",
                table: "Suppliers");
        }
    }
}
