import { ChevronRight, Mail, Settings, Star, Terminal, User } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { ProjectDocument } from '@/schema';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../fixtures/shadcn-app/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../../fixtures/shadcn-app/components/ui/alert';
import { Avatar, AvatarFallback } from '../../fixtures/shadcn-app/components/ui/avatar';
import { Badge } from '../../fixtures/shadcn-app/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../fixtures/shadcn-app/components/ui/breadcrumb';
import { Button } from '../../fixtures/shadcn-app/components/ui/button';
import { Calendar } from '../../fixtures/shadcn-app/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../fixtures/shadcn-app/components/ui/card';
import { Checkbox } from '../../fixtures/shadcn-app/components/ui/checkbox';
import { Input } from '../../fixtures/shadcn-app/components/ui/input';
import { Label } from '../../fixtures/shadcn-app/components/ui/label';
import { Progress } from '../../fixtures/shadcn-app/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../../fixtures/shadcn-app/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../fixtures/shadcn-app/components/ui/select';
import { Separator } from '../../fixtures/shadcn-app/components/ui/separator';
import { Skeleton } from '../../fixtures/shadcn-app/components/ui/skeleton';
import { Slider } from '../../fixtures/shadcn-app/components/ui/slider';
import { Switch } from '../../fixtures/shadcn-app/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../fixtures/shadcn-app/components/ui/tabs';
import { Textarea } from '../../fixtures/shadcn-app/components/ui/textarea';
import { Toggle } from '../../fixtures/shadcn-app/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '../../fixtures/shadcn-app/components/ui/toggle-group';
import { PreviewRoot, type PreviewTheme } from './preview-root';
import { type ForceState, useForceState } from './use-force-state';

interface ThemeToggleProps {
  theme: PreviewTheme;
  onChange: (theme: PreviewTheme) => void;
}

function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-neutral-800 p-1 text-xs">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded px-2 py-1 transition-colors ${
            theme === t
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-100'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

const FORCE_STATE_LABELS: Record<ForceState, string> = {
  off: 'off',
  hover: 'hover',
  'focus-visible': 'focus',
  active: 'active',
  disabled: 'disabled',
};

interface ForceStateToggleProps {
  value: ForceState;
  onChange: (next: ForceState) => void;
}

function ForceStateToggle({ value, onChange }: ForceStateToggleProps) {
  const options: ForceState[] = ['off', 'hover', 'focus-visible', 'active', 'disabled'];
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-neutral-800 p-1 text-xs">
      <span className="px-1.5 text-[10px] uppercase tracking-wide text-neutral-500">force</span>
      {options.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded px-2 py-1 transition-colors ${
            value === s
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-100'
          }`}
        >
          {FORCE_STATE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function ButtonsShowcase() {
  return (
    <Section title="Buttons">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="settings">
          <Settings />
        </Button>
        <Button disabled>Disabled</Button>
      </div>
    </Section>
  );
}

function BadgesShowcase() {
  return (
    <Section title="Badges">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    </Section>
  );
}

function FormControlsShowcase() {
  const [sliderValue, setSliderValue] = useState([50]);
  const [progress, setProgress] = useState(64);
  return (
    <Section title="Form controls">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" placeholder="Tell us about yourself" rows={3} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Plan</Label>
          <Select defaultValue="pro">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Visibility</Label>
          <RadioGroup defaultValue="public" className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="public" id="r-public" />
              <Label htmlFor="r-public" className="font-normal">
                Public
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="private" id="r-private" />
              <Label htmlFor="r-private" className="font-normal">
                Private
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <div className="flex items-center gap-2">
          <Checkbox id="terms" defaultChecked />
          <Label htmlFor="terms" className="font-normal">
            Accept terms
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="notif" defaultChecked />
          <Label htmlFor="notif" className="font-normal">
            Notifications
          </Label>
        </div>
        <ToggleGroup type="single" defaultValue="b">
          <ToggleGroupItem value="b" aria-label="bold">
            B
          </ToggleGroupItem>
          <ToggleGroupItem value="i" aria-label="italic">
            <em>I</em>
          </ToggleGroupItem>
          <ToggleGroupItem value="u" aria-label="underline">
            <u>U</u>
          </ToggleGroupItem>
        </ToggleGroup>
        <Toggle aria-label="star">
          <Star />
        </Toggle>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <Label>Volume</Label>
          <span className="text-xs text-muted-foreground">{sliderValue[0]}</span>
        </div>
        <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <Label>Upload</Label>
          <button
            type="button"
            onClick={() => setProgress((p) => (p >= 100 ? 0 : Math.min(100, p + 17)))}
            className="text-xs text-muted-foreground underline"
          >
            advance
          </button>
        </div>
        <Progress value={progress} />
      </div>
    </Section>
  );
}

function FeedbackShowcase() {
  return (
    <Section title="Feedback">
      <Alert>
        <Terminal className="size-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <Terminal className="size-4" />
        <AlertTitle>Something broke</AlertTitle>
        <AlertDescription>Check your network connection and try again.</AlertDescription>
      </Alert>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </Section>
  );
}

function DataDisplayShowcase() {
  return (
    <Section title="Cards & data display">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage account preferences and visibility.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cards group related content and stay aligned with theme tokens.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>JG</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Jakob Grant</CardTitle>
                <CardDescription>jakob@magickml.com</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="my-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-4" />
              <span>Team admin</span>
            </div>
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <Mail className="size-4" />
              <span>3 unread messages</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function NavigationShowcase() {
  return (
    <Section title="Navigation & disclosure">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Settings</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Theme</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <p className="text-sm text-muted-foreground">
            Tabs use the same focus-ring token as buttons.
          </p>
        </TabsContent>
        <TabsContent value="usage">
          <p className="text-sm text-muted-foreground">42 requests today.</p>
        </TabsContent>
        <TabsContent value="settings">
          <p className="text-sm text-muted-foreground">Configure your team here.</p>
        </TabsContent>
      </Tabs>

      <Accordion type="single" collapsible defaultValue="theme">
        <AccordionItem value="theme">
          <AccordionTrigger>What is a theme?</AccordionTrigger>
          <AccordionContent>
            A theme is a complete set of design tokens — colors, radius, typography, shadows — that
            gives every component a consistent look.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="oklch">
          <AccordionTrigger>Why OKLCH?</AccordionTrigger>
          <AccordionContent>
            OKLCH separates perceived lightness from chroma, so deriving hover/active states with
            color-mix produces visually consistent results.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Section>
  );
}

function CalendarShowcase() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return (
    <Section title="Calendar">
      <div className="inline-block rounded-lg border">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </div>
    </Section>
  );
}

interface CanvasProps {
  document: ProjectDocument;
  /** Controlled theme. Falls back to local state when undefined. */
  theme?: PreviewTheme;
  onThemeChange?: (theme: PreviewTheme) => void;
  /** Controlled force-state. Falls back to the useForceState hook when undefined. */
  forceState?: ForceState;
  onForceStateChange?: (state: ForceState) => void;
}

/**
 * Preview canvas: hosts the PreviewRoot, lays out a representative slice of
 * the fixture's shadcn/ui v4 component set across category sections, and
 * exposes a light/dark toggle. The full set lives in `fixtures/shadcn-app/`
 * and is browsable via the property panel's component selector.
 *
 * Theme and force-state can be controlled by a parent (so the command
 * palette can toggle them) or left uncontrolled, in which case the canvas
 * manages its own state.
 */
export function Canvas({
  document,
  theme: controlledTheme,
  onThemeChange,
  forceState: controlledForceState,
  onForceStateChange,
}: CanvasProps) {
  const [localTheme, setLocalTheme] = useState<PreviewTheme>('light');
  const [localForceState, setLocalForceState] = useForceState();

  const theme = controlledTheme ?? localTheme;
  const forceState = controlledForceState ?? localForceState;
  const setTheme = (next: PreviewTheme) => {
    if (onThemeChange) onThemeChange(next);
    else setLocalTheme(next);
  };
  const setForceState = (next: ForceState) => {
    if (onForceStateChange) onForceStateChange(next);
    else setLocalForceState(next);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-200">Preview</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ForceStateToggle value={forceState} onChange={setForceState} />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </div>

      <div
        className="overflow-auto resize-x min-w-[320px] max-w-full rounded-lg border border-neutral-800"
        style={{ resize: 'horizontal', width: '100%' }}
      >
        <PreviewRoot
          document={document}
          theme={theme}
          forceState={forceState}
          className="min-h-[480px] p-8"
        >
          <div className="flex flex-col gap-10">
            <ButtonsShowcase />
            <BadgesShowcase />
            <FormControlsShowcase />
            <NavigationShowcase />
            <DataDisplayShowcase />
            <FeedbackShowcase />
            <CalendarShowcase />
          </div>
        </PreviewRoot>
      </div>
    </section>
  );
}
