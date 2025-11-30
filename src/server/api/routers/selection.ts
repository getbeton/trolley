import { z } from "zod"
import { Database } from "../../../lib/supabase/types"

import { router, publicProcedure } from "../trpc"
import { logger } from "../../logger"

type CrmSystem = Database["public"]["Enums"]["CrmSystem"]
type SelectionStatus = Database["public"]["Enums"]["SelectionStatus"]

// Create enum object for zod validation
const CrmSystemEnum = {
  TWENTY: "TWENTY" as const,
  ATTIO: "ATTIO" as const,
  INTERNAL: "INTERNAL" as const,
}

const entitySelectionInput = z.object({
  system: z.enum(["TWENTY", "ATTIO", "INTERNAL"]),
  entities: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string().optional(),
      includeInSync: z.boolean().default(true),
      availableFieldCount: z.number().int().nonnegative().optional(),
      sampleRecord: z.record(z.string(), z.any()).optional(),
    })
  ),
})

const fieldSelectionInput = z.object({
  entityId: z.string().cuid(),
  fields: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string().optional(),
      type: z.string().optional(),
      required: z.boolean().optional(),
      isSelected: z.boolean().default(true),
      sampleValue: z.any().optional(),
    })
  ),
})

export const selectionRouter = router({
  saveEntities: publicProcedure
    .input(entitySelectionInput)
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      const { entities, system } = input

      logger.info("Persisting entity selections", {
        count: entities.length,
        system,
      })

      // Process each entity upsert
      for (const entity of entities) {
        const status = (entity.includeInSync ? "READY" : "PENDING") as SelectionStatus

        // Check if exists
        const { data: existing } = await supabase
          .from("EntitySelection")
          .select("id")
          .eq("userId", user.id)
          .eq("system", system as CrmSystem)
          .eq("entityName", entity.name)
          .maybeSingle()

        if (existing) {
          // Update
          await supabase
            .from("EntitySelection")
            .update({
              entityLabel: entity.label,
              includeInSync: entity.includeInSync,
              availableFieldCount: entity.availableFieldCount,
              sampleRecord: entity.sampleRecord,
              status,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existing.id)
        } else {
          // Insert
          await supabase
            .from("EntitySelection")
            .insert({
              userId: user.id,
              system: system as CrmSystem,
              entityName: entity.name,
              entityLabel: entity.label,
              includeInSync: entity.includeInSync,
              availableFieldCount: entity.availableFieldCount,
              sampleRecord: entity.sampleRecord,
              status,
            })
        }
      }

      // Return all entities for this system
      const { data: selections, error } = await supabase
        .from("EntitySelection")
        .select("*")
        .eq("userId", user.id)
        .eq("system", system as CrmSystem)

      if (error) throw error
      return selections
    }),
  saveFields: publicProcedure
    .input(fieldSelectionInput)
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      const { entityId, fields } = input

      logger.info("Persisting field selections", {
        entityId,
        count: fields.length,
      })

      // Process each field upsert
      for (const field of fields) {
        // Check if exists
        const { data: existing } = await supabase
          .from("FieldSelection")
          .select("id")
          .eq("entitySelectionId", entityId)
          .eq("fieldName", field.name)
          .maybeSingle()

        if (existing) {
          // Update
          await supabase
            .from("FieldSelection")
            .update({
              fieldLabel: field.label,
              fieldType: field.type,
              isRequired: field.required ?? false,
              isSelected: field.isSelected,
              sampleValue: field.sampleValue,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existing.id)
        } else {
          // Insert
          await supabase
            .from("FieldSelection")
            .insert({
              entitySelectionId: entityId,
              userId: user.id,
              fieldName: field.name,
              fieldLabel: field.label,
              fieldType: field.type,
              isRequired: field.required ?? false,
              isSelected: field.isSelected,
              sampleValue: field.sampleValue,
            })
        }
      }

      // Return all fields for this entity
      const { data: fieldSelections, error } = await supabase
        .from("FieldSelection")
        .select("*")
        .eq("entitySelectionId", entityId)

      if (error) throw error
      return fieldSelections
    }),
  list: publicProcedure
    .input(z.object({ system: z.enum(["TWENTY", "ATTIO", "INTERNAL"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      let query = supabase
        .from("EntitySelection")
        .select("*, fields:FieldSelection(*)")
        .eq("userId", user.id)
        .order("updatedAt", { ascending: false })

      if (input?.system) {
        query = query.eq("system", input.system as CrmSystem)
      }

      const { data: selections, error } = await query

      if (error) throw error

      logger.info("Loaded entity selections", { count: selections?.length ?? 0 })
      return selections
    }),
})


