using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQualificationStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QualificationNotes",
                table: "Invitations",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QualificationStatus",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QualifiedAtUtc",
                table: "Invitations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QualifiedById",
                table: "Invitations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_QualifiedById",
                table: "Invitations",
                column: "QualifiedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Invitations_Users_QualifiedById",
                table: "Invitations",
                column: "QualifiedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invitations_Users_QualifiedById",
                table: "Invitations");

            migrationBuilder.DropIndex(
                name: "IX_Invitations_QualifiedById",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "QualificationNotes",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "QualificationStatus",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "QualifiedAtUtc",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "QualifiedById",
                table: "Invitations");
        }
    }
}
