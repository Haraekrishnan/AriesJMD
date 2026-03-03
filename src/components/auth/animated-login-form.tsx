
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { useAppContext } from '@/contexts/app-provider';
import Fireworks from '@/components/decorations/Fireworks';
import './animated-login.css';

export function AnimatedLoginForm() {
  const { appName, appLogo } = useAppContext();
  
  return (
    <div className="animated-login-container">
      <Fireworks />
       <Card className="login-card z-10">
        <CardHeader className="text-center">
            <h1 className="title-2026">2026</h1>
            <h2 className="title-happy-new-year">Happy New Year</h2>
            <CardDescription className="text-white/80">Enter your credentials to celebrate with us</CardDescription>
        </CardHeader>
        <CardContent>
            <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
