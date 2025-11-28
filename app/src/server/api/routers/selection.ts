import { CrmSystem, SelectionStatus } from "@prisma/client"
import { z } from "zod"

import { router, publicProcedure } from "../trpc"
import { logger } from "../../logger"

const entitySelectionInput = z.object({
  system: z.nativeEnum(CrmSystem),
  entities: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string().optional(),
      includeInSync: z.boolean().default(true),
      availableFieldCount: z.number().int().nonnegative().optional(),
      sampleRecord: z.record(z.any()).optional(),
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
      const { prisma, user } = ctx
      const { entities, system } = input

      logger.info("Persisting entity selections", {
        count: entities.length,
        system,
      })

      const operations = entities.map((entity) =>
        prisma.entitySelection.upsert({
          where: {
            userId_system_entityName: {
              userId: user.id,
              system,
              entityName: entity.name,
            },
          },
          update: {
            entityLabel: entity.label,
            includeInSync: entity.includeInSync,
            availableFieldCount: entity.availableFieldCount,
            sampleRecord: entity.sampleRecord,
            status: entity.includeInSync ? SelectionStatus.READY : SelectionStatus.PENDING,
          },
          create: {
            userId: user.id,
            system,
            entityName: entity.name,
            entityLabel: entity.label,
            includeInSync: entity.includeInSync,
            availableFieldCount: entity.availableFieldCount,
            sampleRecord: entity.sampleRecord,
            status: entity.includeInSync ? SelectionStatus.READY : SelectionStatus.PENDING,
          },
        })
      )

      await prisma.$transaction(operations)

      return prisma.entitySelection.findMany({
        where: { userId: user.id, system },
      })
    }),
  saveFields: publicProcedure
    .input(fieldSelectionInput)
    .mutation(async ({ ctx, input }) => {
      const { prisma, user } = ctx
      const { entityId, fields } = input

      logger.info("Persisting field selections", {
        entityId,
        count: fields.length,
      })

      const operations = fields.map((field) =>
        prisma.fieldSelection.upsert({
          where: {
            entitySelectionId_fieldName: {
              entitySelectionId: entityId,
              fieldName: field.name,
            },
          },
          update: {
            fieldLabel: field.label,
            fieldType: field.type,
            isRequired: field.required ?? false,
            isSelected: field.isSelected,
            sampleValue: field.sampleValue,
          },
          create: {
            entitySelectionId: entityId,
            userId: user.id,
            fieldName: field.name,
            fieldLabel: field.label,
            fieldType: field.type,
            isRequired: field.required ?? false,
            isSelected: field.isSelected,
            sampleValue: field.sampleValue,
          },
        })
      )

      await prisma.$transaction(operations)

      return prisma.fieldSelection.findMany({
        where: { entitySelectionId: entityId },
      })
    }),
  list: publicProcedure
    .input(z.object({ system: z.nativeEnum(CrmSystem).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { prisma, user } = ctx
      const selections = await prisma.entitySelection.findMany({
        where: {
          userId: user.id,
          system: input?.system,
        },
        include: { fields: true },
        orderBy: { updatedAt: "desc" },
      })

      logger.info("Loaded entity selections", { count: selections.length })
      return selections
    }),
})


