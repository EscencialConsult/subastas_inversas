using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SICST.Persistence.Contexts;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260627162000_AddSupplierArcaVerificationWorkflow")]
    public partial class AddSupplierArcaVerificationWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ArcaVerificationStatus",
                table: "Suppliers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArcaVerifiedAtUtc",
                table: "Suppliers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaVerificationNotes",
                table: "Suppliers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CredentialsSentAtUtc",
                table: "Suppliers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Suppliers"
                SET "ArcaVerificationStatus" = CASE WHEN "ArcaVerified" THEN 1 ELSE 0 END,
                    "ArcaVerifiedAtUtc" = CASE WHEN "ArcaVerified" THEN "CreatedAtUtc" ELSE NULL END,
                    "ArcaVerificationNotes" = CASE
                        WHEN "ArcaVerified" THEN 'Datos fiscales verificados previamente.'
                        ELSE 'Pendiente de verificación ARCA.'
                    END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArcaVerificationStatus",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaVerifiedAtUtc",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaVerificationNotes",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "CredentialsSentAtUtc",
                table: "Suppliers");
        }
    }
}
