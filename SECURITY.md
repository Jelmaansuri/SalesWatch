# PROGENY AGROTECH Security Configuration

## Internal Team Access Control

This system is configured to allow access only to authorized PROGENY AGROTECH team members. 

### Current Security Measures

1. **Email Whitelist**: Only specific email addresses can access the system
2. **Domain Whitelist**: Only company email domains are authorized
3. **Authentication Required**: All routes require valid authentication
4. **Session Security**: Secure session management with PostgreSQL storage
5. **Access Denial Page**: Clear messaging for unauthorized access attempts

### Adding New Team Members

To grant access to new internal team members:

1. **Edit the authorization lists** in `server/replitAuth.ts`:
   - Add individual email addresses to `AUTHORIZED_EMAILS` array
   - Add company domains to `AUTHORIZED_DOMAINS` array

2. **Current configuration**:
```javascript
const AUTHORIZED_EMAILS = [
  "progenyagrotech@gmail.com",
  "afiqsyahmifaridun@gmail.com",
];

const AUTHORIZED_DOMAINS = [
  // No company domains configured
];
```

### Security Best Practices

1. **Regular Review**: Periodically review and update the authorized users list
2. **Remove Access**: Remove email addresses of former team members immediately
3. **Company Domains**: Use company email domains rather than personal emails
4. **Monitor Access**: Check server logs for unauthorized access attempts
5. **Secure Deployment**: Ensure the production environment has proper HTTPS and security headers

### Access Logs

The system logs all authentication attempts:
- Successful logins show: "Access granted: Email [email] is in whitelist"
- Failed attempts show: "Access denied: Email [email] not authorized"
- Missing emails show: "Access denied: No email provided"

### Emergency Access

If you need to temporarily disable access restrictions:
1. Comment out the `isAuthorizedUser` check in `upsertUser` function
2. Redeploy the system
3. Remember to re-enable restrictions immediately after use

### Security Contacts

For security-related questions or issues:
- System Administrator: [Your contact information]
- IT Support: [Your IT support contact]
- Management: [Management contact for access approval]