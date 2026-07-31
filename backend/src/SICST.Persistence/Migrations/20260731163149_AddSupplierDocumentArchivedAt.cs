using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierDocumentArchivedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAtUtc",
                table: "SupplierDocuments",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchivedAtUtc",
                table: "SupplierDocuments");
        }
    }
}
