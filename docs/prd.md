# Product Requirements Document: Context Collector

**Version:** 1.0
**Date:** 2026-03-17
**Status:** Draft
**Owner:** Valter Silva

---

## Executive Summary

Context Collector is a privacy-first browser extension for Chrome/Chromium that extracts conversations, emails, messages, and posts from logged-in web sessions across multiple platforms (WhatsApp, Telegram, Gmail, LinkedIn) and exports them as structured Markdown files. The primary use case is AI agent context bootstrapping - enabling AI coding agents (Claude Code, Cursor, etc.) to understand the user's communications, projects, and relationships for more personalized and contextually aware assistance.

**Key Differentiators:**
- 100% local processing - no external servers or telemetry
- Structured Markdown output optimized for AI consumption
- Platform-agnostic architecture for easy expansion
- One-click extraction from logged-in web sessions

---

## Problem Statement

### Current Pain Points

1. **AI agents lack personal context** - Users must manually copy-paste conversations or explain project context repeatedly to AI assistants.

2. **Context is fragmented** - Professional and personal communications are scattered across WhatsApp, Gmail, LinkedIn, Telegram, and other platforms.

3. **No AI-friendly export format** - Platform-native exports (JSON archives, CSV files) are not optimized for AI agent consumption.

4. **Privacy concerns with cloud services** - Existing context aggregation tools require uploading sensitive conversations to external servers.

5. **Manual extraction is tedious** - Copy-pasting conversations for AI context is time-consuming and error-prone.

### Market Gap

No existing tool provides:
- Local-only extraction from multiple web platforms
- Markdown output structured for AI agent consumption
- One-click extraction from logged-in sessions without API keys
- Privacy-first architecture (zero external dependencies)

---

## Target Users

### Primary Persona: Tech-Savvy Developer
- **Demographics:** Software developers, AI power users, digital nomads
- **Behavior:** Uses AI coding assistants daily (Claude, Cursor, Copilot)
- **Pain:** Spends 10-20 minutes per session manually providing context to AI agents
- **Motivation:** Wants AI agents that "just know" their projects, team dynamics, and communication history
- **Privacy stance:** Highly privacy-conscious, distrusts cloud services with sensitive data

### Secondary Persona: Knowledge Worker
- **Demographics:** Project managers, researchers, consultants
- **Behavior:** Manages multiple projects across email, messaging, and social platforms
- **Pain:** Loses track of important conversations and decisions buried in messaging apps
- **Motivation:** Wants searchable archives of work conversations
- **Privacy stance:** Prefers local control over data

### Non-Target Users
- Non-technical users unfamiliar with browser extensions
- Users seeking comprehensive backup solutions (use platform-native exports instead)
- Enterprise users requiring audit trails and compliance features (future scope)

---

## Goals & Non-Goals

### Goals

1. **Enable AI context bootstrapping** - Provide AI agents with structured, readable conversation history
2. **Preserve privacy** - All data processing happens locally in the browser
3. **Support top 4 platforms** - WhatsApp Web, Telegram Web, Gmail, LinkedIn (MVP)
4. **Incremental extraction** - Only extract new content since last run
5. **Simple UX** - One-click extraction with minimal configuration
6. **Extensible architecture** - Add new platforms with minimal code changes

### Non-Goals

1. **Not a backup tool** - No guarantees of completeness or data integrity
2. **Not a sync tool** - No continuous background monitoring or auto-sync
3. **Not a database** - No local storage of extracted data (files only)
4. **Not API-based** - No integration with platform APIs (uses web scraping)
5. **Not cross-browser** - Chrome/Chromium only (MVP), Firefox later
6. **Not enterprise-focused** - No SSO, audit logs, or compliance features (MVP)

---

## User Stories

### Extraction

1. As a developer, I want to extract all my WhatsApp chats with my team so Claude Code can understand our project discussions.

2. As a knowledge worker, I want to export my Gmail emails by label so I can give AI agents context on specific projects.

3. As a freelancer, I want to extract LinkedIn messages with clients so AI can help me draft proposals based on past conversations.

4. As a user, I want to extract only new messages since my last extraction so I don't duplicate data.

5. As a privacy-conscious user, I want confirmation that no data leaves my computer during extraction.

### Configuration

6. As a user, I want to configure which platforms to extract from so I don't waste time on irrelevant content.

7. As a user, I want to set date ranges for extraction so I can limit scope to recent conversations.

8. As a user, I want to exclude specific chats or contacts from extraction for privacy reasons.

### Output Management

9. As a user, I want to download extracted data as a ZIP file so I can easily share it with AI agents.

10. As a developer, I want extracted Markdown files organized by platform and type so AI agents can navigate them efficiently.

11. As a user, I want to preview extraction results before downloading so I can verify what's included.

### User Experience

12. As a first-time user, I want clear onboarding explaining what the extension does and doesn't do.

13. As a user, I want to see real-time progress during extraction so I know it's working.

14. As a user, I want to cancel a long-running extraction if I change my mind.

---

## Functional Requirements

### FR1: Browser Extension Core

**FR1.1** - Extension popup provides one-click access to extraction controls
**FR1.2** - Settings page (chrome://extensions options) for configuration
**FR1.3** - Manifest V3 compliant with minimal permissions
**FR1.4** - Service worker orchestrates extraction across platform adapters
**FR1.5** - Content scripts injected only on supported platform domains

### FR2: Platform Adapters

**FR2.1** - WhatsApp Web adapter extracts individual and group chats
**FR2.2** - Telegram Web adapter extracts chats, channels, and groups
**FR2.3** - Gmail adapter extracts emails by label and thread
**FR2.4** - LinkedIn adapter extracts messages, posts, saved posts, and connections
**FR2.5** - Each adapter implements standard interface: `canHandle()`, `extractChats()`, `extractMessages()`

### FR3: Content Extraction

**FR3.1** - Extract message sender, timestamp, content, and media references
**FR3.2** - Preserve thread/reply context for email and message threads
**FR3.3** - Handle dynamic content loading (infinite scroll, lazy loading)
**FR3.4** - Extract links, mentions, and formatted text (bold, italics, code)
**FR3.5** - Respect platform rate limits to avoid anti-scraping detection

### FR4: Incremental Extraction

**FR4.1** - Store last extraction timestamp per platform/chat
**FR4.2** - Allow user to choose: full extraction or incremental
**FR4.3** - De-duplicate messages by platform-specific message ID
**FR4.4** - Append new messages to existing Markdown files

### FR5: Markdown Export

**FR5.1** - Generate structured Markdown files per conversation/thread
**FR5.2** - Organize files by platform, type, and name: `extracts/{platform}/{type}/{name}.md`
**FR5.3** - Include metadata header: platform, extraction date, participants
**FR5.4** - Format messages with sender, timestamp, and content
**FR5.5** - Reference media files (images, videos) with placeholders

### FR6: Download & Output

**FR6.1** - Package extracted files as a ZIP archive
**FR6.2** - Download ZIP via browser download API
**FR6.3** - Optionally save to user-configured local directory (future)
**FR6.4** - Include manifest.json in ZIP with extraction metadata

### FR7: User Controls

**FR7.1** - Select platforms to extract from (checkboxes in popup)
**FR7.2** - Set date range filter (last 7 days, last 30 days, all time, custom)
**FR7.3** - Exclude specific chats/contacts via blacklist
**FR7.4** - Preview extraction scope before starting (estimated file count)

### FR8: Progress & Feedback

**FR8.1** - Display real-time progress during extraction (chat X of Y)
**FR8.2** - Show extraction status: idle, running, complete, error
**FR8.3** - Log errors and warnings (e.g., "Failed to extract chat XYZ")
**FR8.4** - Allow user to cancel in-progress extraction

### FR9: Onboarding & Help

**FR9.1** - First-run onboarding explains purpose and privacy model
**FR9.2** - Link to documentation from popup
**FR9.3** - Show example output structure in settings

---

## Non-Functional Requirements

### NFR1: Privacy & Security

**NFR1.1** - All data processing occurs locally in the browser (no external API calls)
**NFR1.2** - No analytics, telemetry, or usage tracking
**NFR1.3** - Extension requests host permissions only for supported domains
**NFR1.4** - No persistent storage of user data (ephemeral processing only)
**NFR1.5** - Clear data management: user can delete extracted files anytime
**NFR1.6** - Open source codebase for security audit

### NFR2: Performance

**NFR2.1** - Extract 100 WhatsApp messages in under 10 seconds
**NFR2.2** - Handle 1000+ messages without browser freeze
**NFR2.3** - Use batching and throttling to avoid UI blocking
**NFR2.4** - Memory footprint under 100MB during extraction

### NFR3: Reliability

**NFR3.1** - Graceful failure if platform DOM changes (log error, continue)
**NFR3.2** - Retry failed extractions up to 3 times with exponential backoff
**NFR3.3** - Validate extracted data before packaging (non-empty messages)

### NFR4: Maintainability

**NFR4.1** - Modular adapter architecture for easy platform addition
**NFR4.2** - Shared extraction pipeline (Adapter → Normalizer → Renderer → Packager)
**NFR4.3** - Selector/pattern updates via JSON config (no code changes for minor DOM shifts)
**NFR4.4** - Unit tests for each adapter and core pipeline

### NFR5: Usability

**NFR5.1** - Extraction requires maximum 3 clicks (open popup → select platforms → extract)
**NFR5.2** - Settings page uses familiar Chrome extension patterns
**NFR5.3** - Error messages are actionable (e.g., "Please log in to WhatsApp Web")

### NFR6: Compatibility

**NFR6.1** - Chrome/Chromium version 110+ (Manifest V3)
**NFR6.2** - Works on Windows, macOS, Linux
**NFR6.3** - Handles platform UI language variants (English, Spanish, Portuguese, etc.)

---

## Technical Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Extension                       │
├─────────────────────────────────────────────────────────────┤
│  Popup UI                Settings Page        Background     │
│  - Platform selection    - Date range         Service Worker │
│  - Extract button        - Exclusions         - Orchestration│
│  - Progress display      - Output format      - State mgmt   │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             │         ┌──────────────────────────┘
             │         │
             ▼         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Content Scripts (per domain)               │
├─────────────────────────────────────────────────────────────┤
│  Platform Adapters:                                          │
│  - WhatsAppAdapter      - TelegramAdapter                    │
│  - GmailAdapter         - LinkedInAdapter                    │
│                                                               │
│  Each implements: canHandle(), extractChats(),               │
│                   extractMessages(chatId)                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Extraction Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│  1. Platform Adapter   → Extract raw DOM/API data            │
│  2. Normalizer         → Convert to standard message format  │
│  3. Markdown Renderer  → Generate .md files                  │
│  4. File Packager      → Bundle as ZIP with manifest         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User initiates extraction** via popup (selects platforms, clicks "Extract")
2. **Service worker** sends message to active tab content script
3. **Content script** determines which adapter to use via `canHandle(url)`
4. **Adapter** extracts chats/conversations (names, IDs, metadata)
5. **Adapter** extracts messages per chat (sender, timestamp, content, media)
6. **Normalizer** converts platform-specific data to standard format
7. **Markdown renderer** generates `.md` files with proper structure
8. **File packager** creates ZIP archive with organized directory structure
9. **Service worker** triggers browser download of ZIP file
10. **Popup** updates to show completion status

### Standard Message Format (Normalized)

```typescript
interface NormalizedMessage {
  id: string;              // Platform-specific message ID
  platform: 'whatsapp' | 'telegram' | 'gmail' | 'linkedin';
  chatId: string;          // Chat/conversation/thread ID
  chatName: string;        // Display name for chat
  chatType: 'individual' | 'group' | 'channel' | 'thread';
  sender: {
    id: string;
    name: string;
    email?: string;        // For email platforms
  };
  timestamp: string;       // ISO 8601 format
  content: {
    text: string;
    html?: string;         // Optional rich content
    links: string[];       // Extracted URLs
    mentions: string[];    // @mentions
    formatting?: {         // Detected formatting
      bold: boolean;
      italic: boolean;
      code: boolean;
    };
  };
  media?: {                // References to media (not extracted)
    type: 'image' | 'video' | 'audio' | 'file';
    filename?: string;
    caption?: string;
  }[];
  replyTo?: string;        // ID of message being replied to
  metadata?: Record<string, any>; // Platform-specific extras
}

interface NormalizedChat {
  id: string;
  platform: 'whatsapp' | 'telegram' | 'gmail' | 'linkedin';
  name: string;
  type: 'individual' | 'group' | 'channel' | 'thread';
  participants: {
    id: string;
    name: string;
    email?: string;
  }[];
  messageCount: number;
  lastMessage?: {
    timestamp: string;
    preview: string;
  };
}
```

### Adapter Interface

```typescript
interface PlatformAdapter {
  // Returns true if this adapter can handle the current page
  canHandle(url: string): boolean;

  // Extract list of available chats/conversations
  extractChats(): Promise<NormalizedChat[]>;

  // Extract messages from a specific chat
  extractMessages(chatId: string, options?: {
    since?: Date;
    limit?: number;
  }): Promise<NormalizedMessage[]>;

  // Platform-specific initialization (e.g., wait for page load)
  initialize(): Promise<void>;

  // Cleanup/teardown
  cleanup(): void;
}
```

---

## Platform Adapters: Implementation Details

### WhatsApp Web Adapter

**URL Pattern:** `https://web.whatsapp.com/*`

**Extraction Strategy:**
- Chat list: Parse `div[role="listitem"]` elements in sidebar
- Messages: Parse `div[data-id]` message bubbles in main panel
- Sender: Extract from `span[data-testid="message-author"]`
- Timestamp: Extract from `span[data-testid="msg-time"]`
- Media: Detect image/video/file containers, extract captions

**Challenges:**
- WhatsApp uses dynamic class names (hash-based) - rely on data attributes
- Infinite scroll requires scrolling to load history
- Media not directly accessible (BLOB URLs) - reference only

**Scrolling Strategy:**
1. Open chat
2. Scroll to top to trigger message loading
3. Wait for new messages to render (MutationObserver)
4. Repeat until no new messages load (reached history start)

**Rate Limiting:** 500ms delay between chat switches to avoid detection

---

### Telegram Web Adapter

**URL Pattern:** `https://web.telegram.org/*`

**Extraction Strategy:**
- Chat list: Parse `.chatlist .chat-item` elements
- Messages: Parse `.message` elements in `.messages-container`
- Sender: Extract from `.message-author` or `.message-sender`
- Timestamp: Extract from `.message-time`
- Message types: Distinguish text, forwarded, system messages

**Challenges:**
- Multiple Telegram web clients (K, Z) with different DOM structures
- Channels vs. groups vs. individual chats have different layouts
- Forwarded messages need special handling (preserve original sender)

**Scrolling Strategy:**
Similar to WhatsApp - scroll to top, load incrementally

**Rate Limiting:** 300ms delay between chat switches

---

### Gmail Adapter

**URL Pattern:** `https://mail.google.com/*`

**Extraction Strategy:**
- Email list: Parse `.zA` rows (thread rows) or use Gmail API interception
- Email content: Parse `.ii.gt` message bodies in thread view
- Labels: Detect from URL params (`#label/Important`) or sidebar selection
- Thread structure: Parse conversation view to link emails in thread

**Challenges:**
- Gmail uses obfuscated class names that change frequently
- Need to handle both conversation view and single-email view
- Large threads require expansion of collapsed messages
- Attachments not directly accessible without download

**API Interception Option:**
- Intercept Gmail's internal API calls (`/_/scs/mail-static/...`)
- Parse JSON responses instead of DOM (more reliable)
- Requires understanding Gmail's private API structure (undocumented)

**Extraction by Label:**
1. Navigate to label view (`#label/Work`)
2. Scroll to load all emails in label
3. Extract thread IDs
4. Open each thread and extract messages

**Rate Limiting:** 1s delay between thread opens

---

### LinkedIn Adapter

**URL Pattern:** `https://www.linkedin.com/*`

**Extraction Strategy:**
- Message threads: Parse `.msg-thread-item` in sidebar
- Messages: Parse `.msg-s-message-list__event` in conversation panel
- Posts: Parse `.feed-shared-update-v2` in feed
- Saved posts: Navigate to "My Items" → "Saved"
- Connections: Parse connection list page

**Challenges:**
- LinkedIn heavily rate-limits scraping (risk of account restrictions)
- Dynamic loading requires careful scroll simulation
- Posts include rich media (images, videos, polls) - extract text only
- Connections list is paginated with "Show more" buttons

**Extraction Scope:**
1. **Messages:** Extract full conversation history per thread
2. **Posts:** Extract user's own posts + saved posts (not entire feed)
3. **Connections:** Extract name, headline, connection date (basic info)

**Rate Limiting:** 2s delay between actions (conservative to avoid detection)

**Risk Mitigation:**
- Warn user that LinkedIn extraction may be slow/risky
- Provide option to skip LinkedIn in extraction settings
- Consider LinkedIn extraction as "experimental" in MVP

---

## Output Format Specification

### Directory Structure

```
extracts/
├── manifest.json              # Extraction metadata
├── whatsapp/
│   ├── chats/
│   │   ├── dad.md             # Individual chat
│   │   ├── work-team.md       # Group chat
│   │   └── _metadata.json     # Chat metadata (participants, extraction date)
│   └── media/
│       └── _references.txt    # List of media files (not extracted)
├── telegram/
│   ├── chats/
│   │   ├── alice.md
│   │   └── bob.md
│   ├── groups/
│   │   └── dev-community.md
│   ├── channels/
│   │   └── tech-news.md
│   └── _metadata.json
├── gmail/
│   ├── emails/
│   │   ├── 2026-03-17-project-kickoff.md
│   │   └── 2026-03-15-client-feedback.md
│   ├── threads/
│   │   └── project-alpha-discussion.md
│   ├── labels/
│   │   ├── work.md            # All emails in "Work" label
│   │   └── important.md
│   └── _metadata.json
└── linkedin/
    ├── messages/
    │   ├── recruiter-jane-doe.md
    │   └── colleague-john-smith.md
    ├── posts/
    │   ├── my-posts.md         # User's own posts
    │   └── saved-posts.md      # Posts user saved
    ├── connections/
    │   └── connections-list.md
    └── _metadata.json
```

### Manifest.json Format

```json
{
  "version": "1.0",
  "extraction_date": "2026-03-17T14:30:00Z",
  "platforms": [
    {
      "name": "whatsapp",
      "chats_extracted": 15,
      "messages_extracted": 3421,
      "date_range": {
        "start": "2025-01-01T00:00:00Z",
        "end": "2026-03-17T14:30:00Z"
      }
    },
    {
      "name": "gmail",
      "emails_extracted": 234,
      "threads_extracted": 45,
      "date_range": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-03-17T14:30:00Z"
      }
    }
  ],
  "options": {
    "incremental": false,
    "date_filter": "last_90_days",
    "excluded_chats": ["spam-group", "old-chat"]
  }
}
```

### Markdown File Format: WhatsApp/Telegram Chat

```markdown
# Chat: Dad

**Platform:** WhatsApp
**Type:** Individual
**Extracted:** 2026-03-17 14:30 UTC
**Messages:** 127
**Date Range:** 2025-01-01 to 2026-03-17

---

## 2026-03-17

**Dad** - 09:15 AM
Good morning! How's the project going?

**You** - 09:47 AM
Morning! It's going well. Just finished the PRD for the Context Collector extension.

**Dad** - 10:03 AM
That's great! What does it do?

**You** - 10:05 AM
It extracts conversations from WhatsApp, Telegram, Gmail, etc. and converts them to Markdown files that AI agents can read. So Claude Code can understand context from my chats.

**Dad** - 10:12 AM
Interesting! Privacy-friendly?

**You** - 10:13 AM
Yes, 100% local. No data leaves the browser.

**Dad** - 10:15 AM
👍

---

## 2026-03-16

**You** - 08:30 PM
Hey, are you free this weekend?

**Dad** - 08:45 PM
Yes, let's meet for lunch on Sunday.

[Media: image] - Caption: Reservation confirmation

**You** - 08:47 PM
Perfect! See you then.

---
```

### Markdown File Format: Gmail Thread

```markdown
# Email Thread: Project Alpha - Kickoff Meeting

**Platform:** Gmail
**Thread ID:** 18df2a3b4c5d6e7f
**Labels:** Work, Important
**Extracted:** 2026-03-17 14:30 UTC
**Participants:** alice@example.com, bob@example.com, you@example.com
**Messages:** 8

---

## Message 1

**From:** alice@example.com (Alice Johnson)
**To:** you@example.com, bob@example.com
**Date:** 2026-03-15 10:00 AM
**Subject:** Project Alpha - Kickoff Meeting

Hi team,

Let's kick off Project Alpha this week. I've scheduled a meeting for Thursday at 2 PM.

Agenda:
- Project scope and goals
- Timeline and milestones
- Team roles and responsibilities

Please confirm attendance.

Best,
Alice

---

## Message 2

**From:** you@example.com (You)
**To:** alice@example.com, bob@example.com
**Date:** 2026-03-15 10:15 AM
**Subject:** Re: Project Alpha - Kickoff Meeting

Confirmed! I'll be there.

Looking forward to it.

---

## Message 3

**From:** bob@example.com (Bob Smith)
**To:** alice@example.com, you@example.com
**Date:** 2026-03-15 11:30 AM
**Subject:** Re: Project Alpha - Kickoff Meeting

Confirmed as well. Can we also discuss the tech stack?

Thanks,
Bob

---
```

### Markdown File Format: LinkedIn Messages

```markdown
# LinkedIn Conversation: Jane Doe (Recruiter at TechCorp)

**Platform:** LinkedIn
**Type:** Individual
**Extracted:** 2026-03-17 14:30 UTC
**Messages:** 12
**Connection Date:** 2025-11-20

---

**Jane Doe** - 2026-03-10 02:15 PM
Hi Valter, I came across your profile and was impressed by your work on AI Dev Brain. We have an exciting senior engineering role at TechCorp. Are you open to discussing opportunities?

**You** - 2026-03-10 05:30 PM
Hi Jane, thanks for reaching out! I'm always interested in learning about new opportunities. What does the role involve?

**Jane Doe** - 2026-03-11 09:00 AM
Great! The role is a Senior Software Engineer position focusing on AI/ML infrastructure. The team works on large-scale model training and deployment. Would you be available for a call this week?

**You** - 2026-03-11 10:45 AM
That sounds interesting. I'm available Thursday or Friday afternoon. What time works for you?

**Jane Doe** - 2026-03-11 11:30 AM
Friday at 2 PM works. I'll send you a calendar invite. Looking forward to speaking with you!

---
```

### Markdown File Format: LinkedIn Posts

```markdown
# My LinkedIn Posts

**Platform:** LinkedIn
**Type:** User Posts
**Extracted:** 2026-03-17 14:30 UTC
**Posts:** 24

---

## Post - 2026-03-15

**Posted:** 2026-03-15 08:00 AM
**Likes:** 142
**Comments:** 18

Just shipped v1.0 of AI Dev Brain - a CLI tool for managing AI-assisted development workflows. It's been an incredible journey building this with Claude Code as my pair programming partner.

Key features:
- Task lifecycle management
- Context accumulation across sessions
- Multi-agent team collaboration
- Zero-config git worktree integration

Check it out on GitHub: [link]

#AI #DevTools #OpenSource

---

## Post - 2026-03-10

**Posted:** 2026-03-10 03:30 PM
**Likes:** 87
**Comments:** 12

Interesting observation: AI coding assistants work best when you give them rich context upfront. Instead of asking "write me a function", try "here's our project structure, our coding conventions, and the problem we're solving - now help me design a solution".

Context is king.

#AI #SoftwareEngineering #BestPractices

---
```

---

## Privacy & Security

### Core Principles

1. **Local Processing Only**
   - All extraction, parsing, and rendering happens in the browser
   - No external API calls (except to platform domains for normal browsing)
   - No analytics, telemetry, or usage tracking
   - No external dependencies on runtime libraries from CDNs

2. **Minimal Permissions**
   - Host permissions requested only for supported domains:
     - `web.whatsapp.com`
     - `web.telegram.org`
     - `mail.google.com`
     - `linkedin.com`
   - No broad `<all_urls>` permission
   - No access to tabs unrelated to supported platforms

3. **Ephemeral Processing**
   - Extracted data held in memory only during processing
   - No persistent storage in extension local storage or IndexedDB
   - Temporary state cleared after ZIP download completes

4. **User Control**
   - User explicitly triggers extraction (no background scraping)
   - User chooses which platforms and chats to extract
   - User can exclude specific chats/contacts
   - Clear "Cancel" option during extraction

5. **Transparency**
   - Open source codebase (GitHub)
   - No obfuscation or minification (except build process)
   - Clear privacy policy in extension listing
   - Onboarding explains privacy model upfront

### Threat Model

**Threats Mitigated:**
- External data exfiltration (no network calls)
- Unauthorized access to user data (local-only processing)
- Platform account compromise (no API keys or credentials stored)

**Threats NOT Mitigated:**
- Malicious code injection via supply chain attack (rely on code review)
- Platform account restrictions for scraping (user assumes risk)
- Loss of downloaded ZIP file (user responsible for file security)

**Residual Risks:**
- Platform DOM changes break extraction (graceful degradation)
- Platform detects scraping and rate-limits or blocks account (conservative rate limiting)
- User downloads ZIP to insecure location (not extension's responsibility)

### Security Best Practices

1. **Content Security Policy (CSP)**
   - Restrict script execution to extension bundle only
   - No eval() or inline scripts
   - No external script loading

2. **Message Passing Security**
   - Validate all messages between popup, service worker, and content scripts
   - Use structured message format with type and payload
   - Reject messages from unknown senders

3. **Dependency Security**
   - Minimize dependencies (use vanilla JS where possible)
   - Pin dependency versions in package.json
   - Regular security audits with npm audit

4. **Code Review**
   - All changes reviewed before merge
   - Security-focused review for adapter code (DOM access)
   - Automated tests for critical paths

---

## Phased Rollout Plan

### Phase 1: MVP (Weeks 1-4)

**Scope:**
- WhatsApp Web adapter (individual chats only)
- Gmail adapter (emails by label)
- Basic popup UI (platform selection, extract button)
- Markdown export with ZIP download
- Basic error handling

**Success Criteria:**
- Extract 100 WhatsApp messages in under 30 seconds
- Generate valid Markdown files readable by AI agents
- Zero external network calls (verified via Chrome DevTools)

**Out of Scope:**
- Telegram, LinkedIn adapters
- Incremental extraction
- Group chats, media extraction
- Advanced settings

### Phase 2: Platform Expansion (Weeks 5-6)

**Scope:**
- Telegram Web adapter (chats, groups, channels)
- LinkedIn adapter (messages only, not posts)
- WhatsApp group chats
- Settings page for date range and exclusions

**Success Criteria:**
- All 4 platforms supported
- Settings persist across browser sessions
- Extract 500 messages across platforms in under 2 minutes

### Phase 3: Incremental Extraction (Weeks 7-8)

**Scope:**
- Store last extraction timestamp per platform/chat
- Incremental mode: extract only new messages since last run
- De-duplication by message ID
- Append to existing Markdown files

**Success Criteria:**
- Incremental extraction reduces time by 80% for repeated runs
- No duplicate messages in output
- User can switch between full and incremental modes

### Phase 4: Polish & Optimization (Weeks 9-10)

**Scope:**
- Improved progress UI (per-chat progress, estimated time)
- LinkedIn posts and saved posts extraction
- Preview mode (show extraction scope before starting)
- Error recovery (retry failed chats)
- Performance optimization (batching, throttling)

**Success Criteria:**
- User satisfaction score 8/10 (via feedback form)
- Extract 1000 messages in under 1 minute
- Fewer than 5% failed extractions

### Phase 5: Future Enhancements (Post-MVP)

**Scope (not committed):**
- Firefox support (Manifest V3 porting)
- Slack, Discord, Twitter/X adapters
- Media download (images, videos) with user consent
- Local directory save (File System Access API)
- AI-powered summarization of extracted conversations
- Enterprise features (audit logs, compliance exports)

---

## Success Metrics

### Primary Metrics

1. **Extraction Success Rate**
   - Target: 95% of extractions complete without error
   - Measure: Ratio of successful extractions to total attempts

2. **Time to Extract**
   - Target: Extract 100 messages in under 10 seconds
   - Measure: Median extraction time per 100 messages

3. **AI Agent Usability**
   - Target: AI agents can parse and understand extracted context
   - Measure: Qualitative feedback from AI coding assistant users

4. **User Satisfaction**
   - Target: 8/10 satisfaction score
   - Measure: In-extension feedback form (post-extraction survey)

### Secondary Metrics

5. **Adoption Rate**
   - Target: 100 active users in first month
   - Measure: Chrome Web Store installation count

6. **Platform Coverage**
   - Target: 4 platforms supported (WhatsApp, Telegram, Gmail, LinkedIn)
   - Measure: Number of platform adapters shipped

7. **Privacy Compliance**
   - Target: Zero external network calls during extraction
   - Measure: Automated test in CI (network monitoring)

8. **Error Recovery**
   - Target: Fewer than 5% of chats fail extraction per run
   - Measure: Error logs collected (anonymized, user opt-in)

### Leading Indicators

9. **Developer Velocity**
   - Target: New platform adapter ships in under 1 week
   - Measure: Time from adapter start to production release

10. **User Retention**
    - Target: 50% of users run extraction more than once
    - Measure: Repeat usage tracking (extension local storage, privacy-friendly)

---

## Open Questions

### Technical

1. **How do we handle platform DOM changes?**
   - Option A: Version adapters per platform version (maintenance burden)
   - Option B: Selector fallback chain (try multiple selectors)
   - Option C: Community-contributed adapter updates (open source model)
   - **Recommendation:** Start with Option B, transition to Option C

2. **Should we support media (image/video) extraction?**
   - Pro: Richer context for AI agents (OCR, image analysis)
   - Con: Large file sizes, complex download logic, privacy risks
   - **Recommendation:** Phase 5 (future), user opt-in only

3. **How do we prevent platform account restrictions?**
   - Conservative rate limiting (tested per platform)
   - Randomized delays between actions (appear human-like)
   - User warning in settings (extraction may trigger anti-scraping)
   - **Recommendation:** All of the above + monitor community feedback

4. **Should we intercept platform APIs vs. parse DOM?**
   - API interception: More reliable, but platforms may detect and block
   - DOM parsing: Fragile (class names change), but undetectable
   - **Recommendation:** DOM parsing for MVP, API interception as fallback (experimental)

### Product

5. **Should we support real-time sync (continuous extraction)?**
   - Pro: Always-up-to-date context for AI agents
   - Con: Battery drain, privacy concerns (background monitoring)
   - **Recommendation:** No for MVP, revisit in Phase 5 with user opt-in

6. **Should we build a companion desktop app?**
   - Pro: Better file system access, no browser dependency
   - Con: Additional platform support (Windows/Mac/Linux), distribution complexity
   - **Recommendation:** No for MVP, browser extension is simpler distribution

7. **Should we support team/enterprise use cases?**
   - Pro: Larger market, potential revenue
   - Con: Compliance requirements (GDPR, SOC2), audit logs, centralized storage
   - **Recommendation:** No for MVP (consumer-focused), revisit based on demand

### Business

8. **What is the monetization model?**
   - Option A: Free and open source (donation-supported)
   - Option B: Free MVP, paid "Pro" version (more platforms, faster extraction)
   - Option C: Free for individuals, paid for teams/enterprises
   - **Recommendation:** Option A for MVP (build community first)

9. **How do we measure impact?**
   - Quantitative: Installation count, extraction frequency, error rates
   - Qualitative: User testimonials, AI agent feedback (e.g., "this context helped me solve X")
   - **Recommendation:** Both, with focus on qualitative for early validation

10. **What is the go-to-market strategy?**
    - Target: AI power users, developer communities (Reddit, Hacker News, Twitter)
    - Channel: Chrome Web Store, GitHub, blog posts, demos
    - **Recommendation:** Launch on Product Hunt, share in AI/dev communities

---

## Appendix: User Flows

### Flow 1: First-Time User - Full Extraction

1. User installs extension from Chrome Web Store
2. Extension icon appears in toolbar
3. User clicks icon → popup opens
4. Onboarding modal appears: "Welcome to Context Collector! This extension extracts your conversations locally..."
5. User clicks "Get Started"
6. Popup shows platform checkboxes: WhatsApp, Telegram, Gmail, LinkedIn
7. User checks "WhatsApp" and "Gmail"
8. User clicks "Extract" button
9. Popup shows progress: "Extracting WhatsApp... 5 chats found"
10. Progress updates: "Extracting messages from chat: Dad (127 messages)"
11. Extraction completes: "Done! 342 messages extracted."
12. ZIP file downloads: `context-collector-2026-03-17.zip`
13. User unzips and finds organized Markdown files
14. User uploads Markdown files to AI agent workspace

### Flow 2: Repeat User - Incremental Extraction

1. User has previously extracted data 1 week ago
2. User clicks extension icon → popup opens
3. Popup shows: "Last extraction: 2026-03-10" and toggle: "Incremental extraction (only new messages)"
4. User enables toggle
5. User selects platforms and clicks "Extract"
6. Extension extracts only messages since 2026-03-10
7. ZIP downloads: `context-collector-incremental-2026-03-17.zip`
8. User merges new files with previous extraction

### Flow 3: Power User - Configuration

1. User clicks extension icon → popup opens
2. User clicks "Settings" link
3. Settings page opens (chrome://extensions options)
4. User sets date range: "Last 30 days"
5. User excludes chat: "old-group-chat"
6. User enables "Preview before extraction"
7. User saves settings
8. User returns to popup and clicks "Extract"
9. Preview modal shows: "Will extract 5 chats, estimated 230 messages"
10. User confirms and extraction proceeds

---

## Appendix: Competitor Analysis

| Product | Platform Support | Export Format | Privacy | Limitations |
|---------|-----------------|---------------|---------|-------------|
| **Platform-native exports** (WhatsApp, Gmail) | Single platform | JSON, MBOX | Local | Not AI-friendly format, manual per platform |
| **ChatGPT Export Tools** | ChatGPT only | Markdown | Cloud | Requires OpenAI account, not multi-platform |
| **Email clients** (Thunderbird, Outlook) | Email only | MBOX, EML | Local | Email-only, requires setup |
| **Context Collector** (this product) | WhatsApp, Telegram, Gmail, LinkedIn | Markdown | Local | No API access, relies on web scraping |

**Key Differentiator:** Only tool that provides AI-optimized Markdown exports from multiple platforms with local-only processing.

---

## Appendix: Technology Stack

**Extension Framework:**
- Manifest V3 (Chrome Extension API)
- TypeScript (type safety, maintainability)
- Web Components (popup UI)
- Service Worker (background orchestration)

**Content Scripts:**
- Vanilla JavaScript (minimal dependencies)
- MutationObserver (dynamic content detection)
- IntersectionObserver (scroll loading)

**Markdown Generation:**
- Custom renderer (no dependencies)
- Frontmatter for metadata
- Markdown-it (optional, for validation)

**Packaging:**
- JSZip (ZIP file generation)
- Chrome Downloads API (file download)

**Testing:**
- Jest (unit tests)
- Playwright (end-to-end tests, DOM simulation)
- Manual testing on live platforms

**Build & Deployment:**
- Rollup (bundling)
- npm scripts (build automation)
- Chrome Web Store (distribution)

---

## Related Documents

- **[UI/UX Design Specification](./ui-ux-design.md)** - Complete design system, wireframes, interaction patterns, and accessibility checklist

---

**Document Status:** Draft for review
**Next Steps:** Review with stakeholders, validate technical feasibility, begin Phase 1 development
**Feedback:** Open GitHub issue or email valter.silva.au@gmail.com
