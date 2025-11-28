"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Circle, Loader2, AlertCircle, ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

type CredentialTypeValue =
  | "TWENTY_BASE_URL"
  | "TWENTY_API_TOKEN"
  | "ATTIO_API_TOKEN"
  | "TOOL_TOKEN"
  | "NOTIFICATION_WEBHOOK"

type StepId = "connect" | "source" | "destination" | "mapping"

type CredentialState = Record<
  CredentialTypeValue,
  { value: string; status: "idle" | "pending" | "success" | "error"; message?: string }
>

const createEmptyCredentialState = (): CredentialState => ({
  TWENTY_BASE_URL: { value: "", status: "idle" },
  TWENTY_API_TOKEN: { value: "", status: "idle" },
  ATTIO_API_TOKEN: { value: "", status: "idle" },
  TOOL_TOKEN: { value: "", status: "idle" },
  NOTIFICATION_WEBHOOK: { value: "", status: "idle" },
})

const credentialFields: Array<{
  type: CredentialTypeValue
  label: string
  helper: string
  placeholder: string
  requiresBaseUrl?: boolean
}> = [
  {
    type: "TWENTY_BASE_URL",
    label: "Twenty base URL",
    helper: "The fully-qualified domain where your Twenty workspace lives.",
    placeholder: "https://crm.yourdomain.com",
  },
  {
    type: "TWENTY_API_TOKEN",
    label: "Twenty API token",
    helper: "Personal access token with entity + field read permissions.",
    placeholder: "tw_{...}",
    requiresBaseUrl: true,
  },
  {
    type: "ATTIO_API_TOKEN",
    label: "Attio API token",
    helper: "Token with object + field read/write permissions.",
    placeholder: "at_{...}",
  },
  {
    type: "TOOL_TOKEN",
    label: "Internal tool token",
    helper: "Used to trigger the downstream migration runner.",
    placeholder: "tool_{...}",
  },
]

const wizardSteps: Array<{
  id: StepId
  title: string
  description: string
}> = [
  {
    id: "connect",
    title: "Connect data sources",
    description: "Validate the Twenty base URL, API token, Attio token, and tool token.",
  },
  {
    id: "source",
    title: "Select Twenty entities & fields",
    description: "Decide which tables and columns we should migrate.",
  },
  {
    id: "destination",
    title: "Review Attio schema",
    description: "Pick the destination objects + fields that will receive data.",
  },
  {
    id: "mapping",
    title: "Confirm mappings & schedule",
    description: "Map fields, estimate runtime, and queue the migration.",
  },
]

export default function MigrationWizardPage() {
  const [activeStep, setActiveStep] = useState<StepId>("connect")
  const [credentialState, setCredentialState] = useState<CredentialState>(createEmptyCredentialState)

  const credentialMutation = api.credentials.validate.useMutation()
  const saveEntities = api.selections.saveEntities.useMutation()
  const saveFields = api.selections.saveFields.useMutation()
  const runState = api.migrations.listRuns.useQuery(undefined, {
    refetchInterval: 4000,
  })
  const queueRun = api.migrations.queueRun.useMutation()

  const sourceEntities = api.entities.listTwenty.useQuery(undefined, {
    enabled: false,
    retry: false,
  })
  const destinationObjects = api.entities.listAttio.useQuery(undefined, {
    enabled: false,
    retry: false,
  })
  const selectionSnapshot = api.selections.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const handleCredentialValueChange = (type: CredentialTypeValue, value: string) => {
    setCredentialState((prev) => ({
      ...prev,
      [type]: { ...prev[type], value },
    }))
  }

  const handleCredentialValidation = async (type: CredentialTypeValue) => {
    const fieldConfig = credentialFields.find((field) => field.type === type)
    const payload = credentialState[type]

    setCredentialState((prev) => ({
      ...prev,
      [type]: { ...prev[type], status: "pending", message: undefined },
    }))

    try {
      await credentialMutation.mutateAsync({
        type,
        secret: payload.value,
        baseUrl:
          type === "TWENTY_API_TOKEN"
            ? credentialState.TWENTY_BASE_URL.value
            : type === "TWENTY_BASE_URL"
              ? payload.value
              : undefined,
      })

      setCredentialState((prev) => ({
        ...prev,
        [type]: { ...prev[type], status: "success", message: "Validated" },
      }))
    } catch (error) {
      setCredentialState((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to validate credential. Check the value and try again.",
        },
      }))
    } finally {
      if (fieldConfig?.requiresBaseUrl && !credentialState.TWENTY_BASE_URL.value) {
        setCredentialState((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            status: "error",
            message: "Enter the Twenty base URL first.",
          },
        }))
      }
    }
  }

  const canAdvanceFromConnect = credentialFields.every(
    (field) => credentialState[field.type].status === "success"
  )

  const stepIndex = wizardSteps.findIndex((step) => step.id === activeStep)
  const goToStep = (direction: "next" | "previous") => {
    const newIndex = stepIndex + (direction === "next" ? 1 : -1)
    if (newIndex >= 0 && newIndex < wizardSteps.length) {
      setActiveStep(wizardSteps[newIndex]!.id)
    }
  }

  const summary = useMemo(() => {
    const entities =
      selectionSnapshot.data?.filter((selection) => selection.includeInSync) ?? []
    const sourceFieldCount = entities.reduce((total, entity) => total + entity.fields.length, 0)

    return {
      entities,
      sourceFieldCount,
    }
  }, [selectionSnapshot.data])

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Beton Trolley · Migration wizard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Migrate Twenty → Attio in three guided passes
        </h1>
        <p className="text-muted-foreground">
          Validate credentials, inspect schemas, curate the fields that matter, and pin a migration
          configuration we can replay safely.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Each step saves to the database automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wizardSteps.map((step, index) => {
              const isActive = activeStep === step.id
              const isComplete = index < stepIndex
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:bg-muted",
                    isActive && "border-primary/40 bg-muted",
                    isComplete && "opacity-80"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{wizardSteps[stepIndex]?.title}</CardTitle>
            <CardDescription>{wizardSteps[stepIndex]?.description}</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {activeStep === "connect" && (
              <ConnectStep
                credentialState={credentialState}
                onValueChange={handleCredentialValueChange}
                onValidate={handleCredentialValidation}
                isMutating={credentialMutation.isPending}
              />
            )}

            {activeStep === "source" && (
              <EntitySelectionStep
                fetchState={sourceEntities}
                onFetch={() => sourceEntities.refetch()}
                onSelectionChange={(entityName, include) =>
                  saveEntities.mutate({
                    system: "TWENTY",
                    entities: [
                      {
                        name: entityName,
                        includeInSync: include,
                      },
                    ],
                  })
                }
                saveState={saveEntities}
              />
            )}

            {activeStep === "destination" && (
              <DestinationSelectionStep
                fetchState={destinationObjects}
                onFetch={() => destinationObjects.refetch()}
                onSelectionChange={(objectName, include) =>
                  saveEntities.mutate({
                    system: "ATTIO",
                    entities: [
                      {
                        name: objectName,
                        includeInSync: include,
                      },
                    ],
                  })
                }
                saveState={saveEntities}
              />
            )}

            {activeStep === "mapping" && (
              <MappingStep
                summary={summary}
                selectionState={selectionSnapshot}
                mappingState={saveFields}
                runState={runState}
                queueRun={queueRun}
              />
            )}
          </CardContent>
          <Separator />
          <CardContent className="flex items-center justify-between pt-6">
            <Button variant="ghost" disabled={stepIndex === 0} onClick={() => goToStep("previous")}>
              Back
            </Button>
            <Button
              onClick={() => goToStep("next")}
              disabled={
                stepIndex === wizardSteps.length - 1 ||
                (activeStep === "connect" && !canAdvanceFromConnect)
              }
            >
              {stepIndex === wizardSteps.length - 1 ? "Review complete" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function ConnectStep({
  credentialState,
  onValueChange,
  onValidate,
  isMutating,
}: {
  credentialState: CredentialState
  onValueChange: (type: CredentialTypeValue, value: string) => void
  onValidate: (type: CredentialTypeValue) => Promise<void>
  isMutating: boolean
}) {
  return (
    <div className="space-y-6">
      {credentialFields.map((field) => {
        const state = credentialState[field.type]
        return (
          <div
            key={field.type}
            className="flex flex-col gap-3 rounded-lg border border-border p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="space-y-1">
              <Label className="text-sm font-medium">{field.label}</Label>
              <p className="text-xs text-muted-foreground">{field.helper}</p>
              <Input
                className="mt-2 w-full"
                placeholder={field.placeholder}
                value={state?.value ?? ""}
                onChange={(event) => onValueChange(field.type, event.target.value)}
                disabled={isMutating && state?.status === "pending"}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => onValidate(field.type)}
                disabled={!state?.value || isMutating}
              >
                {state?.status === "pending" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating…
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
              <CredentialStatusBadge status={state?.status ?? "idle"} message={state?.message} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CredentialStatusBadge({
  status,
  message,
}: {
  status: CredentialState[CredentialTypeValue]["status"]
  message?: string
}) {
  switch (status) {
    case "success":
      return (
        <Badge variant="secondary" className="w-fit gap-1 text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Saved
        </Badge>
      )
    case "error":
      return (
        <Badge variant="destructive" className="w-fit gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {message ?? "Validation failed"}
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="outline" className="w-fit gap-1 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Validating…
        </Badge>
      )
    default:
      return <Badge variant="outline">Awaiting input</Badge>
  }
}

type EntityQuery = ReturnType<typeof api.entities.listTwenty.useQuery>

function EntitySelectionStep({
  fetchState,
  onFetch,
  onSelectionChange,
  saveState,
}: {
  fetchState: EntityQuery
  onFetch: () => void
  onSelectionChange: (entityName: string, include: boolean) => void
  saveState: ReturnType<typeof api.selections.saveEntities.useMutation>
}) {
  const entities = (fetchState.data ?? []) as Array<
    {
      name: string
      label?: string
      fields: Array<{ name: string }>
    }
  >
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Twenty entities</p>
          <p className="text-sm text-muted-foreground">
            Fetch metadata directly from the configured base URL.
          </p>
        </div>
        <Button onClick={onFetch} disabled={fetchState.isFetching}>
          {fetchState.isFetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing
            </>
          ) : (
            "Fetch entities"
          )}
        </Button>
      </div>

      {fetchState.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchState.error.message}
        </div>
      )}

      {entities.length === 0 ? (
        <EmptyState message="Once credentials are valid you can pull entities from Twenty." />
      ) : (
        <ScrollArea className="max-h-[420px] rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Use</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Sample</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((entity) => (
                <TableRow key={entity.name}>
                  <TableCell>
                    <Checkbox
                      onCheckedChange={(checked) =>
                        onSelectionChange(entity.name, Boolean(checked))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entity.label ?? entity.name}</div>
                    <p className="text-xs text-muted-foreground">{entity.name}</p>
                  </TableCell>
                  <TableCell>{entity.fields.length}</TableCell>
                  <TableCell>
                    <SamplePreviewButton variant="twenty" name={entity.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      {saveState.error && (
        <p className="text-xs text-destructive">{saveState.error.message}</p>
      )}
    </div>
  )
}

type DestinationQuery = ReturnType<typeof api.entities.listAttio.useQuery>

function DestinationSelectionStep({
  fetchState,
  onFetch,
  onSelectionChange,
  saveState,
}: {
  fetchState: DestinationQuery
  onFetch: () => void
  onSelectionChange: (objectName: string, include: boolean) => void
  saveState: ReturnType<typeof api.selections.saveEntities.useMutation>
}) {
  const objects = (fetchState.data ?? []) as Array<{
    object_name: string
    label?: string
    fields: Array<{ name: string }>
  }>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Attio objects</p>
          <p className="text-sm text-muted-foreground">
            Decide which objects we should populate during the migration.
          </p>
        </div>
        <Button onClick={onFetch} disabled={fetchState.isFetching}>
          {fetchState.isFetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing
            </>
          ) : (
            "Fetch objects"
          )}
        </Button>
      </div>

      {fetchState.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchState.error.message}
        </div>
      )}

      {objects.length === 0 ? (
        <EmptyState message="Use the button above to load the Attio object catalog." />
      ) : (
        <ScrollArea className="max-h-[420px] rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Use</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Sample</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objects.map((object) => (
                <TableRow key={object.object_name}>
                  <TableCell>
                    <Checkbox
                      onCheckedChange={(checked) =>
                        onSelectionChange(object.object_name, Boolean(checked))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{object.label ?? object.object_name}</div>
                    <p className="text-xs text-muted-foreground">{object.object_name}</p>
                  </TableCell>
                  <TableCell>{object.fields.length}</TableCell>
                  <TableCell>
                    <SamplePreviewButton variant="attio" name={object.object_name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      {saveState.error && (
        <p className="text-xs text-destructive">{saveState.error.message}</p>
      )}
    </div>
  )
}

function MappingStep({
  summary,
  selectionState,
  mappingState,
  runState,
  queueRun,
}: {
  summary: {
    entities: Array<{
      id: string
      entityName: string
      entityLabel: string | null
      fields: Array<{ id: string; fieldName: string; fieldLabel: string | null }>
    }>
    sourceFieldCount: number
  }
  selectionState: ReturnType<typeof api.selections.list.useQuery>
  mappingState: ReturnType<typeof api.selections.saveFields.useMutation>
  runState: ReturnType<typeof api.migrations.listRuns.useQuery>
  queueRun: ReturnType<typeof api.migrations.queueRun.useMutation>
}) {
  const runs = (runState.data ?? []) as Array<{
    id: string
    status: string
    progress: number | null
    recordsProcessed: number | null
    migration: { name: string }
    logs: Array<{ message: string | null }>
  }>

  const [migrationName, setMigrationName] = useState(
    `Migration ${new Date().toLocaleDateString()}`
  )
  const [description, setDescription] = useState("")
  const [queueMessage, setQueueMessage] = useState<string | null>(null)

  const handleQueue = async () => {
    try {
      const response = await queueRun.mutateAsync({
        name: migrationName,
        description,
        recordEstimate: summary.sourceFieldCount * 100,
        etaSeconds: summary.entities.length * 5,
      })

      await fetch(response.executeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: response.runId }),
      })

      setQueueMessage("Run started! Watch the progress table below.")
    } catch (error) {
      setQueueMessage(
        error instanceof Error ? error.message : "Unable to queue the run. Check the console."
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{summary.entities.length}</span> entities
          selected, covering{" "}
          <span className="font-semibold text-foreground">{summary.sourceFieldCount}</span> fields.
        </p>
        <p className="text-xs text-muted-foreground">
          Mapping happens once both the source and destination steps are complete. You can still
          adjust selections before locking a migration slot.
        </p>
      </div>

      {selectionState.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading selections…
        </div>
      ) : summary.entities.length === 0 ? (
        <EmptyState message="No selections saved yet. Complete the previous steps to see a mapping preview." />
      ) : (
        <div className="space-y-3">
          {summary.entities.map((entity) => (
            <div key={entity.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {entity.entityLabel ?? entity.entityName}
                  </p>
                  <p className="text-xs text-muted-foreground">{entity.entityName}</p>
                </div>
                <Badge variant="outline">{entity.fields.length} fields</Badge>
              </div>
              <Separator className="my-3" />
              <div className="grid gap-3 md:grid-cols-2">
                {entity.fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-md border border-dashed border-border/80 p-3 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {field.fieldLabel ?? field.fieldName}
                    </p>
                    <p className="text-xs text-muted-foreground">{field.fieldName}</p>
                    <Textarea
                      className="mt-2"
                      placeholder="Describe the Attio field this should map to…"
                      onBlur={(event) =>
                        mappingState.mutate({
                          entityId: entity.id,
                          fields: [
                            {
                              name: field.fieldName,
                              label: field.fieldLabel ?? undefined,
                              isSelected: Boolean(event.target.value),
                              sampleValue: event.target.value,
                            },
                          ],
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Schedule a dry run</p>
            <p className="text-xs text-muted-foreground">
              We respect the configured rate limit, log every batch, and return a deterministic ETA.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              placeholder="Migration name"
              value={migrationName}
              onChange={(event) => setMigrationName(event.target.value)}
            />
            <Button onClick={handleQueue} disabled={queueRun.isPending}>
              {queueRun.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Queueing…
                </>
              ) : (
                "Queue dry run"
              )}
            </Button>
          </div>
        </div>
        <Textarea
          className="mt-3"
          placeholder="Optional notes for the migration log…"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {queueMessage && <p className="mt-2 text-xs text-muted-foreground">{queueMessage}</p>}
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <p className="text-sm font-semibold text-foreground">Recent runs</p>
          <Badge variant="outline">{runs.length ? `${runs.length} recorded` : "No runs yet"}</Badge>
        </div>
        {runState.error && (
          <p className="px-4 py-2 text-xs text-destructive">{runState.error.message}</p>
        )}
        {runState.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading run history…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Last log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.migration.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{run.status}</Badge>
                  </TableCell>
                  <TableCell>{run.progress ?? 0}%</TableCell>
                  <TableCell>{run.recordsProcessed ?? 0}</TableCell>
                  <TableCell className="max-w-sm text-xs text-muted-foreground">
                    {run.logs[0]?.message ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <AlertCircle className="h-5 w-5" />
      <p>{message}</p>
    </div>
  )
}

function SamplePreviewButton({ variant, name }: { variant: "twenty" | "attio"; name: string }) {
  const twentyMutation = api.entities.sampleTwenty.useMutation()
  const attioMutation = api.entities.sampleAttio.useMutation()
  const isTwenty = variant === "twenty"
  const [preview, setPreview] = useState<string | null>(null)
  const isPending = isTwenty ? twentyMutation.isPending : attioMutation.isPending

  const handlePreview = async () => {
    setPreview(null)
    try {
      const data =
        isTwenty
          ? await twentyMutation.mutateAsync({ entityName: name })
          : await attioMutation.mutateAsync({ objectName: name })
      setPreview(JSON.stringify(data.slice(0, 2), null, 2))
    } catch (error) {
      setPreview(
        error instanceof Error
          ? error.message
          : "Unable to fetch sample data. Confirm credentials first."
      )
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-primary"
        onClick={handlePreview}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading
          </>
        ) : (
          "Preview"
        )}
      </Button>
      {preview && (
        <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2 text-[11px] text-muted-foreground">
          {preview}
        </pre>
      )}
    </div>
  )
}
