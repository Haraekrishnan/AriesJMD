
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Heading,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';
import type { ManpowerProfile, PpeRequest, User } from '@/lib/types';

interface PpeRequestEmailProps {
  ppeData: PpeRequest;
  requester: User;
  employee: ManpowerProfile;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const PpeRequestEmail = ({
  ppeData,
  requester,
  employee,
}: PpeRequestEmailProps) => {
  const lastIssue = (employee.ppeHistory || [])
      .filter(h => h.ppeType === ppeData.ppeType)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
  const lastIssueDate = lastIssue ? new Date(lastIssue.issueDate).toLocaleDateString() : 'N/A';
  const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A';

  return (
    <Html>
      <Head />
      <Preview>New PPE Request for Approval</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New PPE Request for Approval</Heading>
          <Text style={text}>
            A new Personal Protective Equipment (PPE) request has been submitted and requires your approval.
          </Text>
          
          <Section style={box}>
            <Row>
              <Column><Text style={label}>Employee:</Text></Column>
              <Column><Text style={value}>{employee.name}</Text></Column>
            </Row>
            <Row>
              <Column><Text style={label}>Type:</Text></Column>
              <Column><Text style={value}>{ppeData.ppeType}</Text></Column>
            </Row>
            <Row>
              <Column><Text style={label}>Size:</Text></Column>
              <Column><Text style={value}>{ppeData.size}</Text></Column>
            </Row>
             {ppeData.quantity && (
                 <Row>
                    <Column><Text style={label}>Quantity:</Text></Column>
                    <Column><Text style={value}>{ppeData.quantity}</Text></Column>
                 </Row>
             )}
            <Row>
              <Column><Text style={label}>Request Type:</Text></Column>
              <Column><Text style={value}>{ppeData.requestType}</Text></Column>
            </Row>
             <Row>
              <Column><Text style={label}>Requested By:</Text></Column>
              <Column><Text style={value}>{requester.name}</Text></Column>
            </Row>
          </Section>
          
          {ppeData.newRequestJustification && (
            <Section style={{...box, backgroundColor: '#fffbe6', borderColor: '#fde047'}}>
                <Text style={label}>Justification for Request:</Text>
                <Text style={{...value, whiteSpace: 'pre-wrap'}}>{ppeData.newRequestJustification}</Text>
            </Section>
          )}

           {ppeData.eligibility && (
            <Section style={{...box, backgroundColor: ppeData.eligibility.eligible ? '#f0fdf4' : '#fef2f2', borderColor: ppeData.eligibility.eligible ? '#4ade80' : '#f87171'}}>
                <Text style={{...label, color: ppeData.eligibility.eligible ? '#166534' : '#991b1b'}}>Eligibility Status: {ppeData.eligibility.eligible ? 'Eligible' : 'Not Eligible'}</Text>
                <Text style={{...value, color: ppeData.eligibility.eligible ? '#15803d' : '#b91c1c'}}>{ppeData.eligibility.reason}</Text>
            </Section>
          )}

          <Section style={box}>
            <Row>
                <Column><Text style={label}>Joining Date:</Text></Column>
                <Column><Text style={value}>{joiningDate}</Text></Column>
            </Row>
             <Row>
                <Column><Text style={label}>Last Issue Date:</Text></Column>
                <Column><Text style={value}>{lastIssueDate}</Text></Column>
            </Row>
          </Section>

          <Text style={text}>
            <strong>Remarks:</strong> {ppeData.remarks || 'None'}
          </Text>

          {ppeData.attachmentUrl && (
            <Text style={text}>
              <strong>Attachment:</strong>{' '}
              <Link href={ppeData.attachmentUrl} style={anchor}>
                View Attached Image
              </Link>
            </Text>
          )}

          <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
            <Button style={button} href={`${baseUrl}/my-requests`}>
              Review Request
            </Button>
          </Section>
          
          <Hr style={hr} />
          <Text style={footer}>Aries Marine Project Hub</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PpeRequestEmail;

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
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
};

const box = {
  padding: '16px',
  margin: '0 24px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  marginBottom: '16px'
};

const h1 = {
  color: '#334155',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const text = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 24px 24px 24px',
};

const label = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#334155',
    margin: 0
};

const value = {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '20px 0',
};

const footer = {
  color: '#94a3b8',
  fontSize: '12px',
  textAlign: 'center' as const,
};

const anchor = {
  color: '#2563eb',
};
