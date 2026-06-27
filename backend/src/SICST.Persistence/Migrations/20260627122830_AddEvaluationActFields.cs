using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEvaluationActFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EvaluationActHash",
                table: "PurchaseProcesses",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvaluationActSignature",
                table: "PurchaseProcesses",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EvaluationActSignedAtUtc",
                table: "PurchaseProcesses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EvaluationActSignedById",
                table: "PurchaseProcesses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEvaluationActSigned",
                table: "PurchaseProcesses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseProcesses_EvaluationActSignedById",
                table: "PurchaseProcesses",
                column: "EvaluationActSignedById");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseProcesses_Users_EvaluationActSignedById",
                table: "PurchaseProcesses",
                column: "EvaluationActSignedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseProcesses_Users_EvaluationActSignedById",
                table: "PurchaseProcesses");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseProcesses_EvaluationActSignedById",
                table: "PurchaseProcesses");

            migrationBuilder.DropColumn(
                name: "EvaluationActHash",
                table: "PurchaseProcesses");

            migrationBuilder.DropColumn(
                name: "EvaluationActSignature",
                table: "PurchaseProcesses");

            migrationBuilder.DropColumn(
                name: "EvaluationActSignedAtUtc",
                table: "PurchaseProcesses");

            migrationBuilder.DropColumn(
                name: "EvaluationActSignedById",
                table: "PurchaseProcesses");

            migrationBuilder.DropColumn(
                name: "IsEvaluationActSigned",
                table: "PurchaseProcesses");
        }
    }
}
