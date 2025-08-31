# Operational Runbook

## Common Issues and Resolutions

### Issue: Agent Not Responding to Mentions

**Symptoms**: @username commands are ignored in GitHub issues/PRs

**Diagnosis Steps**:
1. Check GitHub Actions workflow status
   ```bash
   gh run list --workflow=compute.yml
   ```

2. Verify PAT is valid
   ```bash
   gh auth status
   ```

3. Check Cloudflare Worker status
   ```bash
   bunx wrangler tail
   ```

**Resolution**:
1. If workflow is stuck, cancel and restart:
   ```bash
   gh run cancel <run-id>
   ```

2. If PAT expired, rotate in GitHub Settings:
   - Generate new PAT with required scopes
   - Update GitHub Actions secret `USER_PAT`

3. Check Worker logs for errors:
   ```bash
   bunx wrangler tail --format json | jq '.logs'
   ```

### Issue: Telegram Messages Not Delivered

**Symptoms**: No response in Telegram chat after sending commands

**Diagnosis Steps**:
1. Check bot token validity
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getMe
   ```

2. Verify MCP server status
   ```bash
   bun run test:telegram-mcp
   ```

3. Check rate limiting
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

**Resolution**:
1. Regenerate bot token if invalid:
   - Message @BotFather
   - Use `/revoke` command
   - Update `TELEGRAM_BOT_TOKEN`

2. Restart MCP server:
   ```bash
   cd telegram-mcp && bun run restart
   ```

3. Implement message queuing for rate limits

### Issue: High Error Rate Alert

**Symptoms**: Monitoring alerts for error rate >5%

**Diagnosis Steps**:
1. Check error logs
   ```bash
   gh run view <run-id> --log-failed
   ```

2. Identify error patterns
   ```bash
   grep ERROR logs/*.log | cut -d: -f2 | sort | uniq -c
   ```

3. Check external service status
   - Claude API: https://status.anthropic.com
   - GitHub: https://githubstatus.com

**Resolution**:
1. For Claude API errors:
   - Implement exponential backoff
   - Reduce request complexity
   - Check rate limits

2. For authentication errors:
   - Rotate affected credentials
   - Verify token scopes

3. For timeout errors:
   - Increase timeout values
   - Optimize command execution

### Issue: Slow Response Times

**Symptoms**: Commands take >30 seconds to respond

**Diagnosis Steps**:
1. Profile execution time
   ```bash
   time bun run test:performance
   ```

2. Check resource usage
   ```bash
   gh run view <run-id> --json jobs
   ```

3. Monitor API latency
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s https://api.anthropic.com/health
   ```

**Resolution**:
1. Optimize Claude prompts
2. Enable response caching
3. Upgrade GitHub Actions runner size
4. Implement parallel processing

## Deployment Procedures

### Standard Deployment

1. **Pre-deployment Checks**
   ```bash
   bun test
   bun run lint
   bun run typecheck
   ```

2. **Deploy to Staging**
   ```bash
   git checkout staging
   git merge development
   git push origin staging
   ```

3. **Validate Staging**
   ```bash
   bun run test:e2e --env=staging
   ```

4. **Deploy to Production**
   ```bash
   gh workflow run deploy.yml -f environment=production
   ```

5. **Post-deployment Validation**
   ```bash
   bun run test:smoke --env=production
   ```

### Emergency Rollback

1. **Identify Last Good Version**
   ```bash
   git log --oneline -n 10
   ```

2. **Immediate Rollback**
   ```bash
   gh workflow run deploy.yml -f version=<last-good-sha>
   ```

3. **Verify Rollback**
   ```bash
   bun run test:smoke
   ```

4. **Investigate Root Cause**
   ```bash
   git diff <last-good-sha> HEAD
   ```

### Hotfix Deployment

1. **Create Hotfix Branch**
   ```bash
   git checkout -b hotfix/issue-description main
   ```

2. **Apply Fix**
   ```bash
   # Make necessary changes
   git commit -m "fix: critical issue description"
   ```

3. **Fast-track Testing**
   ```bash
   bun test -- --testPathPattern=affected
   ```

4. **Deploy Hotfix**
   ```bash
   gh workflow run deploy.yml -f branch=hotfix/issue-description
   ```

## Maintenance Windows

### Scheduled Maintenance

**When**: Tuesday 2-4 AM UTC

**Procedure**:
1. Post notification 24 hours in advance
2. Enable maintenance mode
3. Perform updates
4. Run validation tests
5. Disable maintenance mode
6. Post completion notice

### Emergency Maintenance

**Trigger Conditions**:
- Security vulnerability discovered
- Data corruption detected
- Critical service failure

**Procedure**:
1. Post immediate notification
2. Assess impact and duration
3. Execute emergency procedure
4. Validate fixes
5. Post resolution update

## Monitoring and Alerts

### Key Metrics

| Metric | Normal Range | Alert Threshold | Action |
|--------|-------------|-----------------|---------|
| Response Time | <2s | >5s | Scale resources |
| Error Rate | <1% | >5% | Investigate errors |
| Success Rate | >95% | <90% | Check integrations |
| Queue Depth | <100 | >500 | Scale workers |

### Alert Response

**Critical Alerts** (Immediate Response):
- Service down
- Authentication failure
- Data loss detected

**Warning Alerts** (Within 1 hour):
- High error rate
- Slow response time
- Rate limit approaching

**Info Alerts** (Next business day):
- Deprecated API usage
- Configuration drift
- Certificate expiration warning

## Backup and Recovery

### Backup Schedule

| Component | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| Configuration | Daily | 30 days | GitHub |
| Credentials | Weekly | 90 days | Secure vault |
| Logs | Continuous | 7 days | CloudWatch |
| Metrics | Continuous | 30 days | Datadog |

### Recovery Procedures

**Configuration Recovery**:
```bash
git checkout <date> -- config/
```

**Credential Recovery**:
1. Access secure vault
2. Retrieve backup credentials
3. Update GitHub Secrets
4. Restart services

**Service Recovery**:
```bash
# Full service restart
gh workflow run restart-all.yml
```

## Incident Response

### Severity Levels

**P1 - Critical**: Complete service outage
- Response time: 15 minutes
- Resolution target: 2 hours

**P2 - High**: Major feature unavailable
- Response time: 30 minutes
- Resolution target: 4 hours

**P3 - Medium**: Minor feature degraded
- Response time: 2 hours
- Resolution target: 24 hours

**P4 - Low**: Cosmetic issues
- Response time: Next business day
- Resolution target: 1 week

### Incident Template

```markdown
## Incident Report

**Incident ID**: INC-YYYY-MM-DD-XXX
**Severity**: P1/P2/P3/P4
**Start Time**: YYYY-MM-DD HH:MM UTC
**End Time**: YYYY-MM-DD HH:MM UTC

### Impact
- Affected services:
- Number of users impacted:
- Business impact:

### Root Cause
[Description of what caused the incident]

### Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

### Action Items
- [ ] Immediate fixes
- [ ] Long-term improvements
- [ ] Documentation updates
```

## Security Procedures

### Credential Rotation

**Monthly**:
- API tokens
- Webhook secrets

**Quarterly**:
- GitHub PATs
- Platform credentials

**Annually**:
- SSL certificates
- SSH keys

### Security Incident Response

1. **Containment**
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable emergency access controls

2. **Investigation**
   - Review audit logs
   - Identify attack vector
   - Assess data exposure

3. **Remediation**
   - Apply security patches
   - Update configurations
   - Strengthen controls

4. **Recovery**
   - Restore services
   - Verify integrity
   - Monitor for recurrence

## Contact Information

### Escalation Path

1. **On-call Engineer**: Check PagerDuty
2. **Team Lead**: Via Slack #oncall
3. **Platform Team**: platform-team@company.com
4. **Security Team**: security@company.com

### External Contacts

- **GitHub Support**: enterprise-support@github.com
- **Anthropic Support**: support@anthropic.com
- **Cloudflare Support**: Via dashboard