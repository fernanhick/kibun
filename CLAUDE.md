# kibun — Claude Context

## Codebase Exploration Rules

- **Always use Graphify before exploring the codebase.** Read `graphify-out/graph.html` at the start of any task that requires understanding project structure, finding files, or tracing relationships between components. Do this even when not explicitly asked.
- Only fall back to Glob/Grep after consulting the graph, or for targeted lookups of a known symbol/path.
- The graph is the source of truth for architecture and file relationships. Do not rely solely on memory or assumptions about where things live.

## Implemented Features

### Feature Tour (in-app walkthrough)
See `docs/feature-tour.md` for full details.

- Library: `react-native-spotlight-tour` v4
- 3 steps on the Home screen: Log mood CTA → History tab → Insights tab
- Provider lives in `app/(tabs)/_layout.tsx`
- State tracked in `src/store/tourStore.ts` (`hasSeenTour`)
- Auto-starts on first Home visit via `src/hooks/useTourAutoStart.ts`
- Replayable from Settings → "Feature tour"
- **Key gotcha:** `AttachStep` needs a corrective `style` prop or spotlight positions are wrong — details in `docs/feature-tour.md`
- Testing mode: set `FORCE_TOUR_ON = true` in `src/hooks/useTourAutoStart.ts`
