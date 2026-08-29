import { EmailMessage, ExtractedTaskRecommendation, EnergyLevel, PriorityLevel } from '../types';

/**
 * Action-Intent Heuristic Filter (Layer 2)
 *
 * 1. Reject (return false):
 *    - Typical OTP / verification patterns (isolated 4-to-6 digit numbers near words like "verify", "code", "pin", "otp")
 *    - Receipt, invoice, payment confirmation, transaction, billing boilerplate
 *    - Password reset, security alerts, login notifications
 *
 * 2. Accept (return true) ONLY IF:
 *    - Contains action-oriented intent keywords in subject or body preview
 */
export function isActionableEmail(subject: string, bodySnippet: string): boolean {
  const combined = `${subject || ''} ${bodySnippet || ''}`.toLowerCase();

  // --- REJECTION HEURISTICS ---

  // OTP / Verification Code pattern check (4-8 digit numbers with code/verify/otp keywords)
  const otpPattern = /\b(otp|code|pin|verification|passcode|token)\b[^\n\r.]{0,40}\b\d{4,8}\b|\b\d{4,8}\b[^\n\r.]{0,40}\b(otp|code|pin|verification|passcode|token)\b/i;
  if (otpPattern.test(combined)) {
    return false;
  }

  // Security alert / automated notification / password reset patterns
  const securityRejectPatterns = [
    /\b(security alert|sign-in from|new login|password reset|reset your password|two-factor|2-step verification|access code|account recovery)\b/i,
    /\b(verify your email|confirm your email|confirm your account|activation code)\b/i,
  ];
  if (securityRejectPatterns.some((pattern) => pattern.test(combined))) {
    return false;
  }

  // Receipt / Transactional / Billing boilerplate patterns
  const transactionalRejectPatterns = [
    /\b(receipt for|invoice #|payment received|order confirmation|your order of|subscription renewed|billing statement|auto-renewal|shipping confirmation|package delivered)\b/i,
    /\b(do not reply|no-reply|noreply|mailer-daemon|automated message)\b/i,
  ];
  if (transactionalRejectPatterns.some((pattern) => pattern.test(combined))) {
    return false;
  }

  // --- ACCEPTANCE HEURISTICS (Action-Intent Keywords) ---
  const actionIntentKeywords = [
    'please review',
    'can you',
    'could you',
    'deadline',
    'action required',
    'action needed',
    'update',
    'meeting',
    'task',
    'project',
    'deliverable',
    'feedback',
    'follow up',
    'follow-up',
    'next steps',
    'submit',
    'prepare',
    'approve',
    'approval',
    'review needed',
    'by tomorrow',
    'by eod',
    'asap',
    'urgent',
    'schedule',
    'reschedule',
  ];

  const hasActionIntent = actionIntentKeywords.some((keyword) => combined.includes(keyword));
  return hasActionIntent;
}

/**
 * Fetches recent unread emails from Gmail with Enhanced API Exclusion (Layer 1)
 */
export async function fetchRecentUnreadEmails(accessToken: string): Promise<EmailMessage[]> {
  try {
    // Layer 1: Enhanced API Query Exclusion
    const query =
      'is:unread category:primary -category:promotions -category:social -subject:"code" -subject:"verification" -subject:"OTP" -subject:"security" -subject:"password" -subject:"alert" -from:"no-reply"';
    const encodedQuery = encodeURIComponent(query);

    // 1. List unread messages matching filtered query
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listRes.ok) {
      // Fallback query if standard unread returns none
      const fallbackQuery = encodeURIComponent(
        'category:primary -category:promotions -category:social -subject:"code" -subject:"verification" -subject:"OTP" -subject:"security" -subject:"password" -subject:"alert" -from:"no-reply"'
      );
      const fallbackListRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${fallbackQuery}&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!fallbackListRes.ok) {
        throw new Error('Failed to fetch messages from Gmail');
      }
      const data = await fallbackListRes.json();
      return fetchEmailDetails(accessToken, data.messages || []);
    }

    const data = await listRes.json();
    if (!data.messages || data.messages.length === 0) {
      const fallbackQuery = encodeURIComponent(
        'category:primary -category:promotions -category:social -subject:"code" -subject:"verification" -subject:"OTP" -subject:"security" -subject:"password" -subject:"alert" -from:"no-reply"'
      );
      const fallbackRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${fallbackQuery}&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        return fetchEmailDetails(accessToken, fbData.messages || []);
      }
      return [];
    }

    return fetchEmailDetails(accessToken, data.messages);
  } catch (error: any) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
}

async function fetchEmailDetails(
  accessToken: string,
  messages: { id: string; threadId: string }[]
): Promise<EmailMessage[]> {
  const emailPromises: Promise<EmailMessage | null>[] = messages.map(async (msg) => {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!msgRes.ok) return null;
      const detail = await msgRes.json();

      const headers = detail.payload?.headers || [];
      const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');

      const subject = subjectHeader ? subjectHeader.value : 'No Subject';
      const from = fromHeader ? fromHeader.value : 'Unknown Sender';
      const date = dateHeader ? dateHeader.value : new Date().toISOString();
      const snippet = detail.snippet || '';

      // Extract body preview text
      let bodySnippet = snippet;
      if (detail.payload?.body?.data) {
        try {
          bodySnippet = decodeBase64Utf8(detail.payload.body.data);
        } catch {
          bodySnippet = snippet;
        }
      } else if (detail.payload?.parts) {
        for (const part of detail.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            try {
              bodySnippet = decodeBase64Utf8(part.body.data);
              break;
            } catch {
              // continue
            }
          }
        }
      }

      // Layer 2: Filter with Action-Intent Heuristic check
      if (!isActionableEmail(subject, bodySnippet)) {
        return null;
      }

      const emailObj: EmailMessage = {
        id: msg.id,
        threadId: msg.threadId,
        subject,
        from,
        date,
        snippet,
        bodySnippet: bodySnippet.slice(0, 500),
      };
      return emailObj;
    } catch (e) {
      console.warn('Failed to fetch single message detail:', e);
      return null;
    }
  });

  const results = await Promise.all(emailPromises);
  return results.filter((m): m is EmailMessage => m !== null);
}

function decodeBase64Utf8(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(base64);
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(decoded, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return decoded;
  }
}

/**
 * Calls backend Gemini endpoint or fallback extractor to parse actionable emails into structured tasks
 */
export async function analyzeEmailsWithAI(emails: EmailMessage[]): Promise<EmailMessage[]> {
  // Extra safeguard: only analyze emails that pass the action-intent check
  const actionableEmails = emails.filter((email) =>
    isActionableEmail(email.subject, email.bodySnippet || email.snippet)
  );

  if (actionableEmails.length === 0) {
    return [];
  }

  try {
    const res = await fetch('/api/analyze-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: actionableEmails }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.analyzedEmails && Array.isArray(data.analyzedEmails)) {
        return data.analyzedEmails;
      }
    }
  } catch (err) {
    console.warn('Backend AI analysis endpoint unavailable, using smart local parser:', err);
  }

  // Smart local heuristic fallback extractor
  return actionableEmails.map((email) => {
    const combinedText = `${email.subject} ${email.snippet}`.toLowerCase();
    let energyLevel: EnergyLevel = 'Medium';
    let estimatedTime = '20m';
    let estimatedMinutes = 20;
    let urgency: 'high' | 'medium' | 'low' = 'medium';

    if (
      combinedText.includes('urgent') ||
      combinedText.includes('asap') ||
      combinedText.includes('review') ||
      combinedText.includes('proposal') ||
      combinedText.includes('contract') ||
      combinedText.includes('architecture') ||
      combinedText.includes('quarterly')
    ) {
      energyLevel = 'High';
      estimatedTime = '45m';
      estimatedMinutes = 45;
      urgency = 'high';
    } else if (
      combinedText.includes('newsletter') ||
      combinedText.includes('receipt') ||
      combinedText.includes('confirm') ||
      combinedText.includes('update') ||
      combinedText.includes('fyi') ||
      combinedText.includes('quick')
    ) {
      energyLevel = 'Low';
      estimatedTime = '10m';
      estimatedMinutes = 10;
      urgency = 'low';
    }

    const taskName = cleanSubjectToTask(email.subject);
    const priority: PriorityLevel =
      urgency === 'high' ? 'Critical' : urgency === 'low' ? 'Can Wait' : 'Core';
    const recommendation: ExtractedTaskRecommendation = {
      taskName,
      description: `Action item from ${email.from}: "${email.snippet.slice(0, 100)}..."`,
      estimatedTime,
      estimatedMinutes,
      energyLevel,
      priority,
      urgency,
      reasoning: `Extracted from email subject and content signals (${energyLevel} cognitive load required).`,
      confidence: 0.92,
    };

    return {
      ...email,
      extractedTask: recommendation,
    };
  });
}

function cleanSubjectToTask(subject: string): string {
  let cleaned = subject
    .replace(/^(re|fwd|fw):\s*/i, '')
    .replace(/\[.*?\]\s*/g, '')
    .trim();
  if (!cleaned) cleaned = 'Review incoming correspondence';
  if (!/^(review|respond|reply|approve|check|organize|sync|schedule|prepare)/i.test(cleaned)) {
    cleaned = `Respond / Action: ${cleaned}`;
  }
  return cleaned;
}

