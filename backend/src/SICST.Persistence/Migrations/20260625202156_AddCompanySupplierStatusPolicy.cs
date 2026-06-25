using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanySupplierStatusPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EvaluatedAtUtc",
                table: "CompanySuppliers",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CompanySuppliers",
                type: "text",
                nullable: false,
                defaultValue: "Enabled");

            migrationBuilder.AddColumn<string>(
                name: "WarningMessage",
                table: "CompanySuppliers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EvaluatedAtUtc",
                table: "CompanySuppliers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CompanySuppliers");

            migrationBuilder.DropColumn(
                name: "WarningMessage",
                table: "CompanySuppliers");
        }
    }
}
