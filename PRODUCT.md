# Crestline

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router and TypeScript. TinyFish runs through server route handlers. Server-side PDF generation uses @react-pdf/renderer. No database or authentication library.

## Users

Marketers gathering a company's visual identity and voice for a deck, document, or another agent. The first version is a working single-page tool, as confirmed by the user.

## Product Purpose

Turn a company name or public website into a structured, evidence-backed brand guide that can be inspected and downloaded as JSON or a four-page PDF.

## Operating Context

Enter a query, generate, inspect evidence, download. Recorded Linear, Stripe, and Allbirds samples make the product reviewable without an API key.

## Capabilities and Constraints

- Extract logo candidates, palette, typography, voice, messaging, and source pages.
- Search resolves names and discovers story/brand pages; Fetch supplies HTML, markdown, and stylesheet evidence; Agent fills rendered-observation gaps.
- Local processing structures evidence and quotes source copy; it must not invent colours or taglines.
- Show progress for resolve, search, fetch, agent, compose, and disclose endpoints and calls.
- Keep reports in process memory, keyed by a short id, and build PDFs before reporting completion.
- A request-specific API key lives only in sessionStorage and the request. Server environment keys are supported.
- No accounts, email, billing, saved libraries, uploaded brand books, new artwork, or scheduled recrawls.

## Brand Commitments

Crestline. A crest is the mark; a line is the voice. Clear, practical language focused on the handoff.

## Evidence on Hand

The repository started empty apart from README.md. Demo guides must be labelled recorded and retain evidence URLs and an accurate endpoint history.

## Product Principles

1. Every visual or verbal claim should be traceable to a source.
2. A failed Agent observation does not invalidate usable Fetch evidence.
3. Generation and export work without an account.
4. Samples and live generation are visibly distinct.
