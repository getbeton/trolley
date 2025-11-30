"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, ArrowRight, CheckCircle2, ChevronRight, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  | "NOTIFICATION_WEBHOOK"

const TWENTY_CLOUD_BASE_URL = "https://app.twenty.com"
const TWENTY_CUSTOM_PLACEHOLDER = "https://crm.yourdomain.com"

const isValidUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

type StepId = "connect" | "source" | "destination" | "mapping"

type CredentialState = Record<
  CredentialTypeValue,
  { value: string; status: "idle" | "pending" | "success" | "error"; message?: string }
>

const createEmptyCredentialState = (): CredentialState => ({
  TWENTY_BASE_URL: { value: TWENTY_CLOUD_BASE_URL, status: "idle" },
  TWENTY_API_TOKEN: { value: "", status: "idle" },
  ATTIO_API_TOKEN: { value: "", status: "idle" },
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
    type: "NOTIFICATION_WEBHOOK",
    label: "Notification webhook URL",
    helper: "HTTP(S) endpoint to receive migration status notifications.",
    placeholder: "https://your-domain.com/webhook",
  },
]

const wizardSteps: Array<{
  id: StepId
  title: string
  description: string
  breadcrumb: string
}> = [
  {
    id: "connect",
    title: "Connect data sources",
    description: "Validate the Twenty base URL, API token, Attio token, and tool token.",
    breadcrumb: "Connect",
  },
  {
    id: "source",
    title: "Select Twenty entities & fields",
    description: "Decide which tables and columns we should migrate.",
    breadcrumb: "Select Twenty",
  },
  {
    id: "destination",
    title: "Review Attio schema",
    description: "Pick the destination objects + fields that will receive data.",
    breadcrumb: "Review Attio",
  },
  {
    id: "mapping",
    title: "Confirm mappings & schedule",
    description: "Map fields, estimate runtime, and queue the migration.",
    breadcrumb: "Confirm & run",
  },
]

const SESSION_KEY = "beton-trolley-wizard-session"
const SESSION_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

interface EntitySelection {
  entityName: string
  system: "TWENTY" | "ATTIO"
  includeInSync: boolean
}

interface WizardSession {
  activeStep: StepId
  credentialState: CredentialState
  twentyDomainMode: "cloud" | "custom"
  customTwentyUrl: string
  entitySelections: EntitySelection[]
  previewData: Record<string, Record<string, unknown>[]>
  timestamp: number
}

export default function MigrationWizardPage() {
  const [activeStep, setActiveStep] = useState<StepId>("connect")
  const [credentialState, setCredentialState] = useState<CredentialState>(createEmptyCredentialState)
  const [twentyDomainMode, setTwentyDomainMode] = useState<"cloud" | "custom">("cloud")
  const [customTwentyUrl, setCustomTwentyUrl] = useState("")
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({})
  const [entitySelections, setEntitySelections] = useState<EntitySelection[]>([])
  const [previewData, setPreviewData] = useState<Record<string, Record<string, unknown>[]>>({})

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const session: WizardSession = JSON.parse(stored)
        const now = Date.now()

        // Check if session is still valid (within 30 minutes)
        if (now - session.timestamp < SESSION_EXPIRY_MS) {
          setActiveStep(session.activeStep)
          setCredentialState(session.credentialState)
          setTwentyDomainMode(session.twentyDomainMode)
          setCustomTwentyUrl(session.customTwentyUrl)
          setEntitySelections(session.entitySelections || [])
          setPreviewData(session.previewData || {})
        } else {
          // Session expired, clear it
          localStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (error) {
      console.error("Failed to load wizard session:", error)
      localStorage.removeItem(SESSION_KEY)
    }
    setSessionLoaded(true)
  }, [])

  // Save session to localStorage whenever state changes
  useEffect(() => {
    if (!sessionLoaded) return // Don't save until initial load is complete

    try {
      const session: WizardSession = {
        activeStep,
        credentialState,
        twentyDomainMode,
        customTwentyUrl,
        entitySelections,
        previewData,
        timestamp: Date.now(),
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch (error) {
      console.error("Failed to save wizard session:", error)
    }
  }, [activeStep, credentialState, twentyDomainMode, customTwentyUrl, entitySelections, previewData, sessionLoaded])

  const credentialMutation = api.credentials.validate.useMutation()
  const twentyPreviewMutation = api.entities.sampleTwenty.useMutation()
  const attioPreviewMutation = api.entities.sampleAttio.useMutation()
  const runState = api.migrations.listRuns.useQuery(undefined, {
    refetchInterval: 30000,
  })
  const queueRun = api.migrations.queueRun.useMutation()
  const notificationsState = api.migrations.notifications.useQuery(undefined, {
    refetchInterval: 30000,
  })

  const sourceEntities = api.entities.listTwenty.useQuery(undefined, {
    enabled: false,
    retry: false,
  })
  const destinationObjects = api.entities.listAttio.useQuery(undefined, {
    enabled: false,
    retry: false,
  })

  // Batch-fetch all Twenty preview data when entities load
  useEffect(() => {
    const entities = sourceEntities.data as Array<{ namePlural: string }> | undefined
    if (!entities || entities.length === 0) return

    // Check if we already have all preview data
    const hasAllPreviews = entities.every((entity) => previewData[`twenty:${entity.namePlural}`])
    if (hasAllPreviews) return

    // Batch-fetch all previews
    ;(async () => {
      const newPreviewData: Record<string, Record<string, unknown>[]> = { ...previewData }

      for (const entity of entities) {
        const key = `twenty:${entity.namePlural}`
        if (!newPreviewData[key]) {
          try {
            const data = await twentyPreviewMutation.mutateAsync({ entityName: entity.namePlural })
            newPreviewData[key] = Array.isArray(data) ? data : []

            // Update field count
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
              setFieldCounts(prev => ({ ...prev, [entity.namePlural]: Object.keys(data[0]).length }))
            }
          } catch (error) {
            console.warn(`Failed to fetch preview for ${entity.namePlural}:`, error)
            newPreviewData[key] = []
          }
        }
      }

      setPreviewData(newPreviewData)
    })()
  }, [sourceEntities.data])

  // Batch-fetch all Attio preview data when objects load
  useEffect(() => {
    const objects = destinationObjects.data as Array<{ object_name: string }> | undefined
    if (!objects || objects.length === 0) return

    // Check if we already have all preview data
    const hasAllPreviews = objects.every((obj) => previewData[`attio:${obj.object_name}`])
    if (hasAllPreviews) return

    // Batch-fetch all previews
    ;(async () => {
      const newPreviewData: Record<string, Record<string, unknown>[]> = { ...previewData }

      for (const obj of objects) {
        const key = `attio:${obj.object_name}`
        if (!newPreviewData[key]) {
          try {
            const data = await attioPreviewMutation.mutateAsync({ objectName: obj.object_name })
            newPreviewData[key] = Array.isArray(data) ? data : []

            // Update field count
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
              setFieldCounts(prev => ({ ...prev, [obj.object_name]: Object.keys(data[0]).length }))
            }
          } catch (error) {
            console.warn(`Failed to fetch preview for ${obj.object_name}:`, error)
            newPreviewData[key] = []
          }
        }
      }

      setPreviewData(newPreviewData)
    })()
  }, [destinationObjects.data])

  // Handler for entity/object selection changes (local state only)
  const handleEntitySelectionChange = (entityName: string, system: "TWENTY" | "ATTIO", includeInSync: boolean) => {
    setEntitySelections((prev) => {
      const existingIndex = prev.findIndex(
        (selection) => selection.entityName === entityName && selection.system === system
      )

      if (existingIndex >= 0) {
        // Update existing selection
        const updated = [...prev]
        updated[existingIndex] = { entityName, system, includeInSync }
        return updated
      } else {
        // Add new selection
        return [...prev, { entityName, system, includeInSync }]
      }
    })
  }

  const handleCredentialValueChange = (type: CredentialTypeValue, value: string) => {
    setCredentialState((prev) => ({
      ...prev,
      [type]: { ...prev[type], value, status: "idle", message: undefined },
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

      // Automatically fetch Attio objects after successful validation
      if (type === "ATTIO_API_TOKEN") {
        destinationObjects.refetch()
      }
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

  const handleTwentyDomainModeChange = (mode: "cloud" | "custom") => {
    if (!mode) return
    setTwentyDomainMode(mode)
    handleCredentialValueChange("TWENTY_BASE_URL", mode === "cloud" ? TWENTY_CLOUD_BASE_URL : customTwentyUrl)
  }

  const handleCustomTwentyDomainChange = (value: string) => {
    setCustomTwentyUrl(value)
    if (twentyDomainMode === "custom") {
      handleCredentialValueChange("TWENTY_BASE_URL", value)
    }
  }

  const handleTwentyValidate = async () => {
    const baseUrl = credentialState.TWENTY_BASE_URL.value.trim()
    const token = credentialState.TWENTY_API_TOKEN.value.trim()

    if (!baseUrl || !token) {
      return
    }

    setCredentialState((prev) => ({
      ...prev,
      TWENTY_BASE_URL: { ...prev.TWENTY_BASE_URL, status: "pending", message: undefined },
      TWENTY_API_TOKEN: { ...prev.TWENTY_API_TOKEN, status: "pending", message: undefined },
    }))

    try {
      await credentialMutation.mutateAsync({
        type: "TWENTY_BASE_URL",
        secret: baseUrl,
        baseUrl,
      })
      setCredentialState((prev) => ({
        ...prev,
        TWENTY_BASE_URL: { ...prev.TWENTY_BASE_URL, status: "success", message: "Workspace saved" },
      }))
    } catch (error) {
      setCredentialState((prev) => ({
        ...prev,
        TWENTY_BASE_URL: {
          ...prev.TWENTY_BASE_URL,
          status: "error",
          message:
            error instanceof Error ? error.message : "Unable to save the workspace URL. Verify it.",
        },
        TWENTY_API_TOKEN: { ...prev.TWENTY_API_TOKEN, status: "idle", message: undefined },
      }))
      return
    }

    try {
      await credentialMutation.mutateAsync({
        type: "TWENTY_API_TOKEN",
        secret: token,
        baseUrl,
      })
      setCredentialState((prev) => ({
        ...prev,
        TWENTY_API_TOKEN: { ...prev.TWENTY_API_TOKEN, status: "success", message: "Token validated" },
      }))

      // Automatically fetch Twenty entities after successful validation
      sourceEntities.refetch()
    } catch (error) {
      setCredentialState((prev) => ({
        ...prev,
        TWENTY_API_TOKEN: {
          ...prev.TWENTY_API_TOKEN,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to validate the token. Confirm the value and try again.",
        },
      }))
    }
  }

  const requiredConnectTypes: CredentialTypeValue[] = [
    "TWENTY_BASE_URL",
    "TWENTY_API_TOKEN",
    "ATTIO_API_TOKEN",
  ]
  const canAdvanceFromConnect = requiredConnectTypes.every(
    (type) => credentialState[type].status === "success"
  )

  const stepIndex = wizardSteps.findIndex((step) => step.id === activeStep)
  const goToStep = (direction: "next" | "previous") => {
    const newIndex = stepIndex + (direction === "next" ? 1 : -1)
    if (newIndex >= 0 && newIndex < wizardSteps.length) {
      setActiveStep(wizardSteps[newIndex]!.id)
    }
  }

  const summary = useMemo(() => {
    const entities = entitySelections.filter((selection) => selection.includeInSync)

    return {
      entities,
      sourceFieldCount: 0, // Will be calculated from actual field data if needed
    }
  }, [entitySelections])

  const trimmedCustomTwentyUrl = customTwentyUrl.trim()
  const customTwentyUrlError =
    twentyDomainMode === "custom" && trimmedCustomTwentyUrl.length > 0 && !isValidUrl(trimmedCustomTwentyUrl)
      ? "Enter a valid https:// URL."
      : undefined
  const canValidateTwenty =
    credentialState.TWENTY_API_TOKEN.value.trim().length > 0 &&
    (twentyDomainMode === "cloud" ||
      (trimmedCustomTwentyUrl.length > 0 && isValidUrl(trimmedCustomTwentyUrl)))

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

      <StepBreadcrumbs
        steps={wizardSteps}
        activeStep={activeStep}
        onSelect={(id) => setActiveStep(id)}
      />

      <section className="space-y-6">
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
                twentyMode={twentyDomainMode}
                onTwentyModeChange={handleTwentyDomainModeChange}
                customTwentyUrl={customTwentyUrl}
                onCustomTwentyUrlChange={handleCustomTwentyDomainChange}
                canValidateTwenty={canValidateTwenty}
                customTwentyUrlError={customTwentyUrlError}
                onTwentyValidate={handleTwentyValidate}
              />
            )}

            {activeStep === "source" && (
              <EntitySelectionStep
                fetchState={sourceEntities}
                onFetch={() => sourceEntities.refetch()}
                onSelectionChange={(entityName, include) =>
                  handleEntitySelectionChange(entityName, "TWENTY", include)
                }
                fieldCounts={fieldCounts}
                onFieldCountUpdate={setFieldCounts}
                entitySelections={entitySelections}
                previewData={previewData}
              />
            )}

            {activeStep === "destination" && (
              <DestinationSelectionStep
                fetchState={destinationObjects}
                onFetch={() => destinationObjects.refetch()}
                onSelectionChange={(objectName, include) =>
                  handleEntitySelectionChange(objectName, "ATTIO", include)
                }
                fieldCounts={fieldCounts}
                onFieldCountUpdate={setFieldCounts}
                entitySelections={entitySelections}
                previewData={previewData}
              />
            )}

            {activeStep === "mapping" && (
              <MappingStep
                summary={summary}
                runState={runState}
                queueRun={queueRun}
                notificationsState={notificationsState}
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

function StepBreadcrumbs({
  steps,
  activeStep,
  onSelect,
}: {
  steps: typeof wizardSteps
  activeStep: StepId
  onSelect: (id: StepId) => void
}) {
  const currentIndex = steps.findIndex((step) => step.id === activeStep)

  return (
    <nav aria-label="Wizard progress" className="overflow-x-auto">
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((step, index) => {
          const isPast = index < currentIndex
          const isCurrent = index === currentIndex
          return (
            <li key={step.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 transition",
                  isCurrent
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : isPast
                      ? "border-border bg-background text-foreground hover:border-primary/30"
                      : "border-dashed border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-medium">{step.breadcrumb}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ConnectStep({
  credentialState,
  onValueChange,
  onValidate,
  isMutating,
  twentyMode,
  onTwentyModeChange,
  customTwentyUrl,
  onCustomTwentyUrlChange,
  canValidateTwenty,
  customTwentyUrlError,
  onTwentyValidate,
}: {
  credentialState: CredentialState
  onValueChange: (type: CredentialTypeValue, value: string) => void
  onValidate: (type: CredentialTypeValue) => Promise<void>
  isMutating: boolean
  twentyMode: "cloud" | "custom"
  onTwentyModeChange: (mode: "cloud" | "custom") => void
  customTwentyUrl: string
  onCustomTwentyUrlChange: (value: string) => void
  canValidateTwenty: boolean
  customTwentyUrlError?: string
  onTwentyValidate: () => Promise<void>
}) {
  const secondaryFields = credentialFields.filter((field) =>
    ["ATTIO_API_TOKEN", "NOTIFICATION_WEBHOOK"].includes(field.type)
  )

  return (
    <div className="space-y-6">
      <TwentyCredentialCard
        mode={twentyMode}
        onModeChange={onTwentyModeChange}
        customUrl={customTwentyUrl}
        onCustomUrlChange={onCustomTwentyUrlChange}
        customUrlError={customTwentyUrlError}
        tokenValue={credentialState.TWENTY_API_TOKEN.value}
        onTokenChange={(value) => onValueChange("TWENTY_API_TOKEN", value)}
        baseState={credentialState.TWENTY_BASE_URL}
        tokenState={credentialState.TWENTY_API_TOKEN}
        canValidate={canValidateTwenty}
        onValidate={onTwentyValidate}
        isMutating={isMutating}
      />

      <div className="grid gap-4">
        {secondaryFields.map((field) => (
          <CredentialFieldCard
            key={field.type}
            field={field}
            value={credentialState[field.type]?.value ?? ""}
            status={credentialState[field.type]?.status ?? "idle"}
            message={credentialState[field.type]?.message}
            onChange={(value) => onValueChange(field.type, value)}
            onValidate={() => onValidate(field.type)}
            disabled={isMutating && credentialState[field.type]?.status === "pending"}
            isMutating={isMutating}
          />
        ))}
      </div>
    </div>
  )
}

function TwentyCredentialCard({
  mode,
  onModeChange,
  customUrl,
  onCustomUrlChange,
  customUrlError,
  tokenValue,
  onTokenChange,
  baseState,
  tokenState,
  canValidate,
  onValidate,
  isMutating,
}: {
  mode: "cloud" | "custom"
  onModeChange: (mode: "cloud" | "custom") => void
  customUrl: string
  onCustomUrlChange: (value: string) => void
  customUrlError?: string
  tokenValue: string
  onTokenChange: (value: string) => void
  baseState: CredentialState["TWENTY_BASE_URL"]
  tokenState: CredentialState["TWENTY_API_TOKEN"]
  canValidate: boolean
  onValidate: () => Promise<void>
  isMutating: boolean
}) {
  const isPending = baseState.status === "pending" || tokenState.status === "pending"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Twenty workspace access</CardTitle>
        <CardDescription>Pick your workspace domain and validate the token together.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Workspace</Label>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => value && onModeChange(value as "cloud" | "custom")}
            className="flex w-full gap-2"
          >
            <ToggleGroupItem value="cloud" className="flex-1" aria-label="Use Twenty Cloud">
              Twenty Cloud
            </ToggleGroupItem>
            <ToggleGroupItem value="custom" className="flex-1" aria-label="Use custom domain">
              Custom domain
            </ToggleGroupItem>
          </ToggleGroup>
          {mode === "custom" ? (
            <div className="space-y-1">
              <Input
                placeholder={TWENTY_CUSTOM_PLACEHOLDER}
                value={customUrl}
                onChange={(event) => onCustomUrlChange(event.target.value)}
                className="max-w-xl"
              />
              {customUrlError ? (
                <p className="text-xs text-destructive">{customUrlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Provide the full https:// URL for your Twenty deployment.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Using the managed Twenty Cloud endpoint ({TWENTY_CLOUD_BASE_URL}).
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">API token</Label>
          <Input
            placeholder="tw_{...}"
            value={tokenValue}
            onChange={(event) => onTokenChange(event.target.value)}
            className="max-w-xl"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={onValidate}
            disabled={!canValidate || isMutating}
            className="w-full sm:w-auto sm:min-w-[160px]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating…
              </>
            ) : (
              "Save Twenty access"
            )}
          </Button>
          <div className="flex flex-wrap gap-2">
            <CredentialStatusBadge status={baseState.status} message={baseState.message} />
            <CredentialStatusBadge status={tokenState.status} message={tokenState.message} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CredentialFieldCard({
  field,
  value,
  status,
  message,
  onChange,
  onValidate,
  disabled,
  isMutating,
}: {
  field: (typeof credentialFields)[number]
  value: string
  status: CredentialState[CredentialTypeValue]["status"]
  message?: string
  onChange: (value: string) => void
  onValidate: () => Promise<void>
  disabled: boolean
  isMutating: boolean
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{field.label}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {field.helper}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
          <Input
            className="mt-1 w-full max-w-[18rem] sm:max-w-[20rem]"
            placeholder={field.placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <Button
            variant="default"
            className="w-full min-w-[140px] sm:w-auto lg:min-w-[150px]"
            onClick={onValidate}
            disabled={!value || isMutating}
          >
            {status === "pending" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating…
              </>
            ) : (
              "Validate"
            )}
          </Button>
          <CredentialStatusBadge status={status} message={message} />
        </div>
      </CardContent>
    </Card>
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
  fieldCounts,
  onFieldCountUpdate,
  entitySelections,
  previewData,
}: {
  fetchState: EntityQuery
  onFetch: () => void
  onSelectionChange: (entityName: string, include: boolean) => void
  fieldCounts: Record<string, number>
  onFieldCountUpdate: React.Dispatch<React.SetStateAction<Record<string, number>>>
  entitySelections: EntitySelection[]
  previewData: Record<string, Record<string, unknown>[]>
}) {
  const entities = (fetchState.data ?? []) as Array<
    {
      id: string
      nameSingular: string
      namePlural: string
      labelSingular?: string
      labelPlural?: string
      fields: Array<{ name: string }>
    }
  >

  // Create a map of entity names to their selection status
  const selectionMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    entitySelections.forEach((selection) => {
      if (selection.system === "TWENTY") {
        map[selection.entityName] = selection.includeInSync
      }
    })
    return map
  }, [entitySelections])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Twenty entities</p>
          <p className="text-sm text-muted-foreground">
            {fetchState.isFetching && entities.length === 0
              ? "Loading entities from your workspace..."
              : "Entities are loaded automatically when credentials are validated."}
          </p>
        </div>
        {entities.length > 0 && (
          <Button onClick={onFetch} disabled={fetchState.isFetching} variant="outline" size="sm">
            {fetchState.isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        )}
      </div>

      {fetchState.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchState.error.message}
        </div>
      )}

      {fetchState.isFetching && entities.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border p-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading entities from Twenty...</p>
        </div>
      ) : entities.length === 0 ? (
        <EmptyState message="No entities found. Check your Twenty credentials and try again." />
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
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
                <TableRow key={entity.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectionMap[entity.nameSingular] ?? false}
                      onCheckedChange={(checked) =>
                        onSelectionChange(entity.nameSingular, Boolean(checked))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entity.labelSingular ?? entity.nameSingular}</div>
                    <p className="text-xs text-muted-foreground">{entity.nameSingular}</p>
                  </TableCell>
                  <TableCell>{fieldCounts[entity.namePlural] ?? entity.fields.length}</TableCell>
                  <TableCell>
                    <SamplePreviewButton
                      variant="twenty"
                      name={entity.namePlural}
                      cachedData={previewData[`twenty:${entity.namePlural}`]}
                      onFieldCountCalculated={(count) => {
                        onFieldCountUpdate(prev => ({ ...prev, [entity.namePlural]: count }))
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  )
}

type DestinationQuery = ReturnType<typeof api.entities.listAttio.useQuery>

function DestinationSelectionStep({
  fetchState,
  onFetch,
  onSelectionChange,
  fieldCounts,
  onFieldCountUpdate,
  entitySelections,
  previewData,
}: {
  fetchState: DestinationQuery
  onFetch: () => void
  onSelectionChange: (objectName: string, include: boolean) => void
  fieldCounts: Record<string, number>
  onFieldCountUpdate: React.Dispatch<React.SetStateAction<Record<string, number>>>
  entitySelections: EntitySelection[]
  previewData: Record<string, Record<string, unknown>[]>
}) {
  const objects = (fetchState.data ?? []) as Array<{
    id?: string
    object_name: string
    label?: string
    fields?: Array<{ name: string }>
  }>

  // Create a map of object names to their selection status
  const selectionMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    entitySelections.forEach((selection) => {
      if (selection.system === "ATTIO") {
        map[selection.entityName] = selection.includeInSync
      }
    })
    return map
  }, [entitySelections])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Attio objects</p>
          <p className="text-sm text-muted-foreground">
            {fetchState.isFetching && objects.length === 0
              ? "Loading objects from your workspace..."
              : "Objects are loaded automatically when credentials are validated."}
          </p>
        </div>
        {objects.length > 0 && (
          <Button onClick={onFetch} disabled={fetchState.isFetching} variant="outline" size="sm">
            {fetchState.isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        )}
      </div>

      {fetchState.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchState.error.message}
        </div>
      )}

      {fetchState.isFetching && objects.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border p-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading objects from Attio...</p>
        </div>
      ) : objects.length === 0 ? (
        <EmptyState message="No objects found. Check your Attio credentials and try again." />
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
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
              {objects.map((object, index) => (
                <TableRow key={`${object.object_name}-${index}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectionMap[object.object_name] ?? false}
                      onCheckedChange={(checked) =>
                        onSelectionChange(object.object_name, Boolean(checked))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{object.label ?? object.object_name}</div>
                    <p className="text-xs text-muted-foreground">{object.object_name}</p>
                  </TableCell>
                  <TableCell>{fieldCounts[object.object_name] ?? object.fields?.length ?? 0}</TableCell>
                  <TableCell>
                    <SamplePreviewButton
                      variant="attio"
                      name={object.object_name}
                      cachedData={previewData[`attio:${object.object_name}`]}
                      onFieldCountCalculated={(count) => {
                        onFieldCountUpdate(prev => ({ ...prev, [object.object_name]: count }))
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  )
}

function MappingStep({
  summary,
  runState,
  queueRun,
  notificationsState,
}: {
  summary: {
    entities: EntitySelection[]
    sourceFieldCount: number
  }
  runState: ReturnType<typeof api.migrations.listRuns.useQuery>
  queueRun: ReturnType<typeof api.migrations.queueRun.useMutation>
  notificationsState: ReturnType<typeof api.migrations.notifications.useQuery>
}) {
  const runs = (runState.data ?? []) as Array<{
    id: string
    status: string
    progress: number | null
    recordsProcessed: number | null
    migration: { name: string }
    logs: Array<{ message: string | null }>
  }>
  const notifications = (notificationsState.data ?? []) as Array<{
    id: string
    status: string
    event: string
    targetUrl: string
    createdAt: string
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

      {summary.entities.length === 0 ? (
        <EmptyState message="No selections saved yet. Complete the previous steps to see a mapping preview." />
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Selected Entities</p>
            <div className="space-y-2">
              {summary.entities.map((entity, index) => (
                <div key={`${entity.system}-${entity.entityName}-${index}`} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-foreground">{entity.entityName}</p>
                    <p className="text-xs text-muted-foreground">{entity.system}</p>
                  </div>
                  <Badge variant={entity.system === "TWENTY" ? "default" : "secondary"}>
                    {entity.system}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
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

      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <p className="text-sm font-semibold text-foreground">Notification deliveries</p>
          <Badge variant="outline">
            {notifications.length ? `${notifications.length} recent` : "No attempts yet"}
          </Badge>
        </div>
        {notificationsState.error && (
          <p className="px-4 py-2 text-xs text-destructive">{notificationsState.error.message}</p>
        )}
        {notificationsState.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notification history…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>{notification.event}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        notification.status === "DELIVERED"
                          ? "secondary"
                          : notification.status === "FAILED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {notification.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {notification.targetUrl}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
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

function SamplePreviewButton({
  variant,
  name,
  cachedData,
  onFieldCountCalculated,
}: {
  variant: "twenty" | "attio"
  name: string
  cachedData?: Record<string, unknown>[]
  onFieldCountCalculated?: (count: number) => void
}) {
  const [showPreview, setShowPreview] = useState(false)

  const handlePreview = () => {
    setShowPreview(!showPreview)

    // Calculate field count from first record if not already calculated
    if (cachedData && cachedData.length > 0 && typeof cachedData[0] === "object" && cachedData[0] !== null) {
      const fieldCount = Object.keys(cachedData[0]).length
      onFieldCountCalculated?.(fieldCount)
    }
  }

  const previewText = cachedData
    ? JSON.stringify(cachedData.slice(0, 2), null, 2)
    : "Preview data not yet loaded. Please wait a moment."

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-primary"
        onClick={handlePreview}
        disabled={!cachedData}
      >
        {showPreview ? "Hide" : "Preview"}
      </Button>
      {showPreview && (
        <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2 text-[11px] text-muted-foreground">
          {previewText}
        </pre>
      )}
    </div>
  )
}
