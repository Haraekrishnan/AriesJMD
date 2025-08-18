
import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PpeRequestEmailProps {
  requesterName: string;
  employeeName: string;
  ppeType: 'Coverall' | 'Safety Shoes';
  size: string;
  quantity: number;
  requestType: 'New' | 'Replacement';
  remarks?: string;
  attachmentUrl?: string;
  joiningDate?: string;
  rejoiningDate?: string;
  lastIssueDate?: string;
  stockInfo?: string;
  eligibility?: {
    eligible: boolean;
    reason: string;
  } | null;
  newRequestJustification?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function PpeRequestEmail({
  requesterName,
  employeeName,
  ppeType,
  size,
  quantity,
  requestType,
  remarks,
  attachmentUrl,
  joiningDate,
  rejoiningDate,
  lastIssueDate,
  stockInfo,
  eligibility,
  newRequestJustification,
}: PpeRequestEmailProps) {
  const previewText = `PPE Request for ${employeeName}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  const approvalLink = `${appUrl}/my-requests`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Text style={heading}>New PPE Request for Approval</Text>
            
            <Text style={paragraph}>
              A new PPE request has been submitted by <strong>{requesterName}</strong> for employee <strong>{employeeName}</strong>.
            </Text>

            <Hr style={hr} />

            <Text style={paragraph}>
              <strong>Item:</strong> {ppeType}<br />
              <strong>Size:</strong> {size}<br />
              <strong>Quantity:</strong> {quantity}<br />
              <strong>Request Type:</strong> {requestType}
            </Text>

            {newRequestJustification && (
              <Section style={justificationBox}>
                <Text>
                  <strong>Justification for Request:</strong><br />
                  {newRequestJustification}
                </Text>
              </Section>
            )}

            {remarks && (
              <Text style={paragraph}>
                <strong>Requester Remarks:</strong> {remarks}
              </Text>
            )}

            <Hr style={hr} />

            <Text style={paragraph}>
              <strong>Employee Joining Date:</strong> {joiningDate || 'N/A'}<br />
              <strong>Last Re-Joining Date:</strong> {rejoiningDate || 'N/A'}<br />
              <strong>Last {ppeType} Issue Date:</strong> {lastIssueDate || 'N/A'}<br />
              <strong>Current Stock:</strong> <strong style={{ color: '#dc3545' }}>{stockInfo || 'N/A'}</strong>
            </Text>

            {eligibility && (
                <Section style={eligibility.eligible ? eligibilityBoxGood : eligibilityBoxBad}>
                    <Text>
                        <strong>Eligibility Status: {eligibility.eligible ? 'Eligible' : 'Not Eligible'}</strong><br/>
                        {eligibility.reason}
                    </Text>
                </Section>
            )}

            {attachmentUrl && (
              <Text style={paragraph}>
                <strong>Attachment:</strong> <a href={attachmentUrl} style={anchor}>View Attached Image</a>
              </Text>
            )}

            <Button style={button} href={approvalLink}>
              Review Request
            </Button>

            <Hr style={hr} />
            
            <Text style={footer}>
              Aries Marine Project Hub
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const box = {
  padding: '0 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const heading = {
  color: '#0056b3',
  fontSize: '24px',
  fontWeight: 'bold',
  lineHeight: '1.2',
  margin: '30px 0 15px',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const eligibilityBoxBase = {
    padding: '12px',
    marginTop: '16px',
    borderRadius: '4px',
}

const eligibilityBoxGood = {
    ...eligibilityBoxBase,
    borderLeft: '4px solid #28a745',
    backgroundColor: '#f0fff4',
}

const eligibilityBoxBad = {
    ...eligibilityBoxBase,
    borderLeft: '4px solid #dc3545',
    backgroundColor: '#fdf2f2',
}

const justificationBox = {
    ...eligibilityBoxBase,
    borderLeft: '4px solid #ffc107',
    backgroundColor: '#fffbeb',
}

const anchor = {
  color: '#0056b3',
};

const button = {
  backgroundColor: '#007bff',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
