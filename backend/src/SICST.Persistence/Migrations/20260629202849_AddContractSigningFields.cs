using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractSigningFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invitations_Suppliers_SupplierId",
                table: "Invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_Invitations_Users_QualifiedById",
                table: "Invitations");

            migrationBuilder.AddColumn<string>(
                name: "SignatureHash",
                table: "Contracts",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SignedByOperatorId",
                table: "Contracts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_SignedByOperatorId",
                table: "Contracts",
                column: "SignedByOperatorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Contracts_Users_SignedByOperatorId",
                table: "Contracts",
                column: "SignedByOperatorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Invitations_Suppliers_SupplierId",
                table: "Invitations",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Invitations_Users_QualifiedById",
                table: "Invitations",
                column: "QualifiedById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Contracts_Users_SignedByOperatorId",
                table: "Contracts");

            migrationBuilder.DropForeignKey(
                name: "FK_Invitations_Suppliers_SupplierId",
                table: "Invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_Invitations_Users_QualifiedById",
                table: "Invitations");

            migrationBuilder.DropIndex(
                name: "IX_Contracts_SignedByOperatorId",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "SignatureHash",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "SignedByOperatorId",
                table: "Contracts");

            migrationBuilder.AddForeignKey(
                name: "FK_Invitations_Suppliers_SupplierId",
                table: "Invitations",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Invitations_Users_QualifiedById",
                table: "Invitations",
                column: "QualifiedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
