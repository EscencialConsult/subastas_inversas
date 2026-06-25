using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovalWorkflowLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ApprovalWorkflowLevelId",
                table: "Approvals",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApprovalWorkflowLevels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovalWorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                    LevelOrder = table.Column<int>(type: "integer", nullable: false),
                    RequiredRole = table.Column<int>(type: "integer", nullable: false),
                    AmountThreshold = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalWorkflowLevels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApprovalWorkflowLevels_ApprovalWorkflows_ApprovalWorkflowId",
                        column: x => x.ApprovalWorkflowId,
                        principalTable: "ApprovalWorkflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Approvals_ApprovalWorkflowLevelId",
                table: "Approvals",
                column: "ApprovalWorkflowLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalWorkflowLevels_ApprovalWorkflowId_LevelOrder",
                table: "ApprovalWorkflowLevels",
                columns: new[] { "ApprovalWorkflowId", "LevelOrder" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Approvals_ApprovalWorkflowLevels_ApprovalWorkflowLevelId",
                table: "Approvals",
                column: "ApprovalWorkflowLevelId",
                principalTable: "ApprovalWorkflowLevels",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Approvals_ApprovalWorkflowLevels_ApprovalWorkflowLevelId",
                table: "Approvals");

            migrationBuilder.DropTable(
                name: "ApprovalWorkflowLevels");

            migrationBuilder.DropIndex(
                name: "IX_Approvals_ApprovalWorkflowLevelId",
                table: "Approvals");

            migrationBuilder.DropColumn(
                name: "ApprovalWorkflowLevelId",
                table: "Approvals");
        }
    }
}
