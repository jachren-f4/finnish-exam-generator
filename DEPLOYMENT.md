# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Gemini API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Deployment Steps

### 1. Deploy to Vercel

**Option A: Deploy via Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js and configure build settings
5. Click "Deploy"

**Option B: Deploy via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? Select your account
# - Link to existing project? N
# - Project name? Accept default or customize
# - In which directory is your code located? ./
# - Want to modify settings? N
```

### 2. Configure Environment Variables

After deployment, add your environment variables:

**Via Vercel Dashboard:**
1. Go to your project dashboard
2. Click "Settings" tab
3. Click "Environment Variables"
4. Add the following:

| Name | Value | Environment |
|------|-------|-------------|
| `GEMINI_API_KEY` | `your_actual_api_key_here` | Production, Preview, Development |

**Via Vercel CLI:**
```bash
# Add environment variable
vercel env add GEMINI_API_KEY production
# Paste your API key when prompted

# Also add for preview and development if needed
vercel env add GEMINI_API_KEY preview
vercel env add GEMINI_API_KEY development
```

### 3. Redeploy with Environment Variables

After adding environment variables, trigger a new deployment:

**Via Dashboard:**
- Go to "Deployments" tab
- Click "..." next to the latest deployment
- Click "Redeploy"

**Via CLI:**
```bash
vercel --prod
```

## Your Deployed URLs

After successful deployment, you'll have:

- **Production URL**: `https://your-project-name.vercel.app`
- **API Endpoints**:
  - Web interface: `https://your-project-name.vercel.app`
  - Mobile API: `https://your-project-name.vercel.app/api/mobile/exam-questions`
  - Upload API: `https://your-project-name.vercel.app/api/files/upload`
  - Jobs API: `https://your-project-name.vercel.app/api/ocr/jobs`

## Flutter App Configuration

Update your Flutter app's base URL:

```dart
// Replace with your actual Vercel URL
static const String baseUrl = 'https://your-project-name.vercel.app';
```

## Vercel Configuration

The project includes `vercel.json` with:
- **Function timeout**: 5 minutes (300s) for AI processing
- **API routes**: Properly configured for Next.js App Router

## Post-Deployment Testing

### Test Web Interface
1. Visit your Vercel URL
2. Upload a textbook image
3. Verify exam questions are generated
4. Check that costs are displayed

### Test Mobile API
Use a tool like Postman or curl:

```bash
curl -X POST \
  'https://your-project-name.vercel.app/api/mobile/exam-questions' \
  -H 'Content-Type: multipart/form-data' \
  -F 'images=@/path/to/test-image.jpg' \
  -F 'prompt=Generate 5 simple math questions'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "examQuestions": { ... },
    "metadata": { ... }
  }
}
```

## Monitoring and Logs

### View Function Logs
1. Go to your Vercel project dashboard
2. Click "Functions" tab
3. Click on any API function to see logs
4. Or use CLI: `vercel logs your-project-name`

### Monitor Usage
- Check Vercel dashboard for function execution stats
- Monitor your Gemini API quota in Google AI Studio
- Track costs and token usage via the app's built-in statistics

## Custom Domain (Optional)

To use your own domain:

1. **Via Dashboard:**
   - Go to "Settings" → "Domains"
   - Add your domain
   - Configure DNS as instructed

2. **DNS Configuration:**
   - Add a CNAME record pointing to `cname.vercel-dns.com`
   - Or add A records pointing to Vercel's IP addresses

## Troubleshooting

### Common Issues

**1. Environment Variable Not Working**
- Ensure variable is set in all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check variable name matches exactly (`GEMINI_API_KEY`)

**2. Function Timeout**
- Current timeout is 5 minutes (300s)
- For larger image batches, consider client-side image compression
- Monitor function execution time in Vercel logs

**3. File Upload Issues**
- Files are temporarily stored in `/tmp` directory
- Vercel has a 50MB payload limit for serverless functions
- Files are automatically cleaned up after processing

**4. API Key Errors**
- Verify your Gemini API key is valid
- Check API key permissions in Google AI Studio
- Ensure billing is set up for Google Cloud (if required)

### Debug Mode

To enable more detailed logging, check the Vercel function logs:
```bash
vercel logs --follow
```

### Local Development vs Production

**Local Development:**
- Uses `http://localhost:3000`
- Stores files in local `uploads` directory
- Uses `.env.local` for environment variables

**Production (Vercel):**
- Uses `https://your-project-name.vercel.app`
- Stores files in serverless `/tmp` directory
- Uses Vercel environment variables

## Security Notes

- ✅ **API Key Security**: API key is stored securely in Vercel environment variables
- ✅ **File Cleanup**: Uploaded files are automatically deleted after processing  
- ✅ **Serverless**: No persistent file storage reduces security risks
- ✅ **HTTPS**: All traffic encrypted via Vercel's SSL certificates

## Cost Optimization

- **Vercel**: Free tier includes 100GB bandwidth, 100 function executions
- **Gemini API**: Pay per token usage, monitor via built-in cost tracking
- **File Processing**: Images compressed and cleaned up to minimize costs

## Support

- **Vercel Issues**: [Vercel Support](https://vercel.com/help)
- **Gemini API**: [Google AI Documentation](https://ai.google.dev/docs)
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)

## Production Checklist

- ✅ Repository pushed to Git hosting
- ✅ Vercel project created and deployed
- ✅ `GEMINI_API_KEY` environment variable added
- ✅ Production deployment tested via web interface
- ✅ Mobile API endpoint tested
- ✅ Flutter app updated with production URL
- ✅ Function logs monitored for errors
- ✅ Custom domain configured (if applicable)

Your Finnish Exam Question Generator is now live and ready for production use!