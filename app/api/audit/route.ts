import { z } from "zod";
import { AppError, toSafeErrorPayload } from "@/lib/errors";
import { checkRateLimit, extractClientIp, hashClientId } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/env";
import { normalizeUrl } from "@/features/audit/url-security";
import { AUDIT_MODES } from "@/features/audit/types";
import { createRun } from "@/features/agent/run-store";
import { executeAuditRun } from "@/features/agent/loop";
