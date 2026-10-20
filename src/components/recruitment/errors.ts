export function recruitmentErrorMessage(error:unknown):string {
 const code=String((error as {code?:string})?.code||'').toLowerCase();
 if(code.includes('permission_denied')||code.includes('permission-denied'))return 'The database rejected recruitment access. Please check that the updated recruitment database rules have been deployed.';
 if(code.includes('network')||code.includes('unavailable'))return 'Could not connect to the database. Check your connection and retry.';
 return error instanceof Error?error.message:'Could not load recruitment. Please try again.';
}
