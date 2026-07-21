using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingModelChanges : Migration
    {
        // NOTA: esta migración era un duplicado exacto de 20260701190000_AddOutboxMessages
        // (misma tabla OutboxMessages, mismas columnas y los mismos 4 índices).
        // Al crear la tabla por segunda vez, rompía cualquier instalación desde cero con
        // "42P07: relation OutboxMessages already exists", y eso impedía que corriera el
        // sembrado inicial (quedaba la base sin usuarios).
        //
        // Se deja intencionalmente VACÍA en lugar de borrar el archivo, porque su Id ya
        // está registrado en __EFMigrationsHistory de las bases existentes.

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sin operaciones: la tabla ya la crea AddOutboxMessages.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sin operaciones: el rollback de la tabla corresponde a AddOutboxMessages.
        }
    }
}
