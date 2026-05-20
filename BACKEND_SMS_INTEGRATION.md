# Backend SMS Integration Guide - Issue #9

## Overview
This guide provides instructions for implementing SMS notifications for bills sent to users' phone numbers.

## Current State
Bills are currently sent via email only. SMS integration needs to be added to notify users via their phone numbers.

## Implementation Steps

### 1. Choose SMS Provider
Popular options in Kenya:
- **Africa's Talking** (Recommended for Kenya)
- **Twilio** (International)
- **Pesapal** (East Africa)

### 2. Install SMS Provider Package

```bash
# For Africa's Talking
npm install africastalking

# For Twilio
npm install twilio

# For Pesapal
npm install pesapal-sdk
```

### 3. Create SMS Service

Create `/backend/src/services/sms.service.ts`:

```typescript
import africastalking from 'africastalking';
import logger from '../utils/logger';

const client = africastalking({
  apiKey: process.env.AFRICAS_TALKING_API_KEY,
  username: process.env.AFRICAS_TALKING_USERNAME,
});

const sms = client.SMS;

export class SMSService {
  async sendBillNotification(
    phoneNumber: string,
    residentName: string,
    billNumber: string,
    totalAmount: number,
    billingMonth: string,
    dueDate: string
  ) {
    try {
      const message = `Hi ${residentName}, your water bill ${billNumber} for ${billingMonth} is KES ${totalAmount}. Due date: ${dueDate}. Pay via M-Pesa or visit our office. Legacy Homes`;

      const response = await sms.send({
        to: [phoneNumber],
        message: message,
      });

      logger.info(`SMS sent to ${phoneNumber} for bill ${billNumber}`);
      return response;
    } catch (error) {
      logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async sendPaymentReminder(
    phoneNumber: string,
    residentName: string,
    billNumber: string,
    daysOverdue: number
  ) {
    try {
      const message = `Hi ${residentName}, your bill ${billNumber} is ${daysOverdue} days overdue. Please pay immediately to avoid disconnection. Legacy Homes`;

      const response = await sms.send({
        to: [phoneNumber],
        message: message,
      });

      logger.info(`Reminder SMS sent to ${phoneNumber}`);
      return response;
    } catch (error) {
      logger.error(`Failed to send reminder SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async sendPaymentConfirmation(
    phoneNumber: string,
    residentName: string,
    billNumber: string,
    amountPaid: number,
    balance: number
  ) {
    try {
      const message = `Hi ${residentName}, payment of KES ${amountPaid} received for bill ${billNumber}. Balance: KES ${balance}. Thank you! Legacy Homes`;

      const response = await sms.send({
        to: [phoneNumber],
        message: message,
      });

      logger.info(`Payment confirmation SMS sent to ${phoneNumber}`);
      return response;
    } catch (error) {
      logger.error(`Failed to send payment confirmation SMS:`, error);
      throw error;
    }
  }
}

export const smsService = new SMSService();
```

### 4. Update Billing Service

Modify `/backend/src/services/billing.service.ts`:

```typescript
import { smsService } from './sms.service';

export class BillingService {
  async generateMonthlyBills(billingMonth: string) {
    // ... existing code ...

    for (const reading of readings) {
      // ... existing bill creation code ...

      bills.push(bill);

      try {
        // Send email notification
        await sendBillNotificationEmail(
          house.resident.email,
          house.resident.fullName,
          bill.billNumber,
          bill.totalAmount,
          billingMonth,
          dueDate.toLocaleDateString('en-KE')
        );

        // Send SMS notification
        if (house.resident.phone) {
          await smsService.sendBillNotification(
            house.resident.phone,
            house.resident.fullName,
            bill.billNumber,
            bill.totalAmount,
            billingMonth,
            dueDate.toLocaleDateString('en-KE')
          );
        }
      } catch (err) {
        logger.error(`Failed to send notifications for ${bill.billNumber}:`, err);
      }
    }

    return {
      generated: bills.length,
      // ... rest of response ...
    };
  }
}
```

### 5. Update Payment Service

Modify `/backend/src/services/payment.service.ts`:

```typescript
async recordPayment(billId: string, amountPaid: number) {
  // ... existing payment logic ...

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { resident: true },
  });

  // Send payment confirmation SMS
  if (bill?.resident?.phone) {
    await smsService.sendPaymentConfirmation(
      bill.resident.phone,
      bill.resident.fullName,
      bill.billNumber,
      amountPaid,
      bill.balance
    );
  }

  // ... rest of logic ...
}
```

### 6. Environment Variables

Add to `.env`:

```env
# Africa's Talking
AFRICAS_TALKING_API_KEY=your_api_key_here
AFRICAS_TALKING_USERNAME=your_username_here

# Or for Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 7. Add SMS Logging

Create `/backend/src/models/smsLog.ts`:

```typescript
import { prisma } from '../lib/prisma';

export interface SMSLog {
  id: string;
  residentId: string;
  phoneNumber: string;
  message: string;
  type: 'BILL' | 'REMINDER' | 'PAYMENT' | 'OTHER';
  status: 'SENT' | 'FAILED';
  sentAt: Date;
  response?: string;
}

export async function logSMS(data: Omit<SMSLog, 'id' | 'sentAt'>) {
  return prisma.sMSLog.create({
    data: {
      ...data,
      sentAt: new Date(),
    },
  });
}
```

### 8. Database Migration

Create migration for SMS logs:

```sql
CREATE TABLE "SMSLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "residentId" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "response" TEXT,
  FOREIGN KEY ("residentId") REFERENCES "Resident"("id")
);

CREATE INDEX "SMSLog_residentId_idx" ON "SMSLog"("residentId");
CREATE INDEX "SMSLog_sentAt_idx" ON "SMSLog"("sentAt");
```

### 9. Testing

```typescript
// Test SMS service
import { smsService } from './services/sms.service';

async function testSMS() {
  try {
    await smsService.sendBillNotification(
      '+254712345678',
      'John Kamau',
      'BILL-20240101-1234',
      2500,
      'January 2024',
      '2024-02-01'
    );
    console.log('SMS sent successfully');
  } catch (error) {
    console.error('Failed to send SMS:', error);
  }
}
```

### 10. Scheduled Reminders

Add cron job for overdue payment reminders:

```typescript
import cron from 'node-cron';

// Send reminders for bills 7 days overdue
cron.schedule('0 9 * * *', async () => {
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 7);

  const overdueBills = await prisma.bill.findMany({
    where: {
      status: 'UNPAID',
      dueDate: { lt: overdueDate },
    },
    include: { resident: true },
  });

  for (const bill of overdueBills) {
    const daysOverdue = Math.floor(
      (new Date().getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (bill.resident?.phone) {
      await smsService.sendPaymentReminder(
        bill.resident.phone,
        bill.resident.fullName,
        bill.billNumber,
        daysOverdue
      );
    }
  }
});
```

## Testing Checklist

- [ ] SMS service initializes correctly
- [ ] Test SMS sends successfully
- [ ] Bill notifications include SMS
- [ ] Payment confirmations include SMS
- [ ] Overdue reminders send via SMS
- [ ] SMS logs are recorded in database
- [ ] Error handling works properly
- [ ] Phone number validation works

## Troubleshooting

### SMS Not Sending
1. Check API credentials in environment variables
2. Verify phone number format (should include country code)
3. Check SMS provider account balance
4. Review SMS logs for error messages

### High SMS Costs
1. Batch SMS messages where possible
2. Implement SMS rate limiting
3. Allow users to opt-out of SMS notifications
4. Monitor SMS usage

### Phone Number Issues
1. Validate phone numbers on resident creation
2. Allow users to update phone numbers
3. Handle invalid phone numbers gracefully

## Cost Estimation

- Africa's Talking: ~KES 0.50-1.00 per SMS
- Twilio: ~$0.0075 per SMS
- Estimated monthly cost (1000 residents): KES 500-1000

## Security Considerations

1. Never log full phone numbers in plain text
2. Use environment variables for API keys
3. Implement rate limiting to prevent abuse
4. Validate all phone numbers before sending
5. Implement SMS content filtering
6. Monitor for suspicious activity

## Compliance

- GDPR: Ensure SMS opt-in/opt-out mechanism
- CCPA: Provide SMS preference settings
- Local regulations: Check Kenya's communication regulations

## Next Steps

1. Choose SMS provider
2. Set up account and get API credentials
3. Implement SMS service
4. Update billing and payment services
5. Test thoroughly
6. Deploy to production
7. Monitor SMS delivery rates
8. Gather user feedback

