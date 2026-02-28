# AWS Workflow for My Team

## 🎯 **What This Guide Is For**

This explains how our team works with AWS for the IAM Dashboard project. It's written in simple terms for beginners.

---

## 🔐 **Your AWS Access**

### **What You Can Do:**
- ✅ **Log into AWS Console** (read-only access)
- ✅ **Monitor and debug** (see what's happening)
- ✅ **Assume roles** (get full access when needed)
- ✅ **Test everything** (S3, Lambda, DynamoDB, etc.)

### **What You Cannot Do:**
- ❌ **Save changes permanently** (console changes are temporary)
- ❌ **Deploy to production** (console changes get overwritten)
- ❌ **Work without GitHub** (all real changes must go through code)

---

## 🚀 **How Our Workflow Works**

### **Step 1: Pick an Issue**
- Go to GitHub Issues
- Pick an issue (like "Create S3 Bucket")
- Create a branch: `git checkout -b feature/s3-bucket`

### **Step 2: Work on the Issue**
- **Read the issue** (follow the steps)
- **Write code** (Terraform, Python, etc.)
- **Test in console** (assume role, test functionality)
- **Debug if needed** (use console to see what's happening)

### **Step 3: Save Your Work**
- **Add your changes:** `git add .`
- **Commit your work:** `git commit -m "feat: add S3 bucket"`
- **Push to feature branch:** `git push origin feature/s3-bucket`
- **Create Pull Request** (for code review)
- **Wait for approval** (before merging)

### **Step 4: Verify It Works**
- **Check AWS Console** (see your resources)
- **Test the functionality** (make sure it works)
- **Update PR description** (what you changed)
- **Request review** (ask teammates to review)
- **Merge after approval** (when approved)

---

## 🌿 **Git Workflow (Important!)**

### **Branch Naming Convention:**
- **Feature branches:** `feature/issue-name` (e.g., `feature/s3-bucket`)
- **Bug fixes:** `fix/issue-name` (e.g., `fix/lambda-error`)
- **Never work on main branch** (always create a feature branch)

### **Complete Git Workflow:**
```bash
# 1. Create and switch to feature branch
git checkout -b feature/s3-bucket

# 2. Make your changes (write code, test, etc.)
# ... your work here ...

# 3. Add changes to staging
git add .

# 4. Commit with descriptive message
git commit -m "feat: add S3 bucket for scan results storage"

# 5. Push to feature branch (NOT main!)
git push origin feature/s3-bucket

# 6. Create Pull Request on GitHub
# 7. Wait for team review and approval
# 8. Merge after approval
```

### **Commit Message Format:**
- **feat:** new feature (e.g., `feat: add S3 bucket`)
- **fix:** bug fix (e.g., `fix: resolve Lambda timeout`)
- **docs:** documentation (e.g., `docs: update README`)
- **test:** testing (e.g., `test: add unit tests`)

---

## 🎯 **Your AWS Permissions**

### **Default Access (Read-Only):**
```
You → IAMDash-Team Group → Read-Only Policy → Can Monitor/Debug
```

### **Full Access (When Needed):**
```
You → Assume IAMDash-Developer-Dev Role → Full Access → Can Create/Test/Modify
```

### **How to Get Full Access:**
1. **Log into AWS Console**
2. **Click "Switch Role"** (top right)
3. **Enter role name:** `IAMDash-Developer-Dev`
4. **Now you have full access!**

---

## 🛠️ **Common Tasks**

### **Testing S3 Bucket:**
```bash
# List bucket contents
aws s3 ls s3://iam-dashboard-scan-results-[suffix]/

# Upload test file
aws s3 cp test.txt s3://iam-dashboard-scan-results-[suffix]/
```

### **Testing Lambda Function:**
```bash
# Test function directly
aws lambda invoke --function-name iam-dashboard-api --payload '{"httpMethod":"GET","path":"/health"}' response.json
cat response.json
```

### **Testing API Gateway:**
```bash
# Test HTTP endpoint
curl https://[api-id].execute-api.us-east-1.amazonaws.com/dev/health
```

### **Testing DynamoDB:**
```bash
# List tables
aws dynamodb list-tables

# Scan table
aws dynamodb scan --table-name iam-dashboard-scan-results
```

---

## 💡 **Important Rules**

### **✅ DO:**
- **Use console for testing** (quick debugging)
- **Write code in GitHub** (permanent changes)
- **Test everything** (make sure it works)
- **Ask for help** (when you're stuck)
- **Follow the issue steps** (don't skip steps)

### **❌ DON'T:**
- **Make permanent changes in console** (they get overwritten)
- **Skip the GitHub workflow** (all changes must go through code)
- **Work alone** (ask for help when needed)
- **Rush through issues** (take your time to understand)

---

## 🎯 **The 8 Issues We're Working On**

1. **Create S3 Bucket** (1.5 hours) - Storage for our data
2. **Deploy Lambda Function** (2 hours) - Our API backend
3. **Add API Gateway** (1.5 hours) - Make API accessible via HTTP
4. **Create DynamoDB Table** (1.5 hours) - Database for scan results
5. **Connect Lambda to DynamoDB** (2 hours) - Full backend integration
6. **Frontend Hosting** (1.5 hours) - Host our website
7. **GitHub Actions CI/CD** (2 hours) - Automated deployment
8. **Security & Testing** (2 hours) - Make it secure and test everything

---

## 🚀 **Getting Started**

### **First Time Setup:**
1. **Log into AWS Console** (use your credentials)
2. **Assume IAMDash-Developer-Dev role** (get full access)
3. **Pick an issue** from GitHub
4. **Create feature branch** (`git checkout -b feature/issue-name`)
5. **Follow the steps** in the issue
6. **Test everything** (make sure it works)
7. **Commit and push to feature branch** (save your work)
8. **Create Pull Request** (for team review)

### **Every Day:**
1. **Check GitHub Issues** (see what's available)
2. **Pick an issue** (or continue working on one)
3. **Create feature branch** (if starting new issue)
4. **Follow the workflow** (console testing + GitHub code)
5. **Push to feature branch** (never push to main!)
6. **Create Pull Request** (for team review)
7. **Ask for help** (when you need it)
8. **Celebrate wins** (you're learning real skills!)

---

## 🎉 **What You'll Learn**

- **Real AWS skills** (S3, Lambda, DynamoDB, CloudFront)
- **Infrastructure as Code** (Terraform)
- **DevOps practices** (CI/CD, monitoring)
- **Security best practices** (IAM, tagging, least privilege)
- **Git workflow** (branching, PRs, collaboration)
- **Team collaboration** (working together on a project)

---

## 💬 **Need Help?**

- **Ask your teammates** (they're learning too!)
- **Check the issue details** (step-by-step instructions)
- **Use the console** (debug and see what's happening)
- **Read the error messages** (they usually tell you what's wrong)

---

**Remember: This is a learning experience!** 🎓

Take your time, ask questions, and don't be afraid to make mistakes. That's how you learn!

**Happy coding!** 🚀