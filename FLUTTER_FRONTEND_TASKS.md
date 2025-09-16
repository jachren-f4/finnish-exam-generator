# Flutter Frontend Task List - MVP ExamGenie (Supabase Architecture)

## Phase 1: Clean Slate Preparation

### 1.1 Backup and Version Control
- [ ] Create git commit with current state
- [ ] Tag current version as `legacy-ui-backup`
- [ ] Create new branch `mvp-production-ui`

### 1.2 Remove Legacy UI Components
- [ ] Delete `lib/screens/camera_screen.dart` (668 lines)
- [ ] Delete `lib/screens/exam_result_screen.dart` (636 lines)
- [ ] Delete `lib/screens/upload_confirmation_screen.dart` (594 lines)
- [ ] Delete `lib/screens/processing_screen.dart` (273 lines)
- [ ] Delete `lib/widgets/compression_progress_dialog.dart` (446 lines)
- [ ] Clean up `main.dart` - remove old navigation logic

### 1.3 Dependencies Audit - Supabase Integration
- [ ] Add `supabase_flutter: ^2.5.6` for complete Supabase integration
- [ ] Add `url_launcher: ^6.2.1` for WhatsApp sharing
- [ ] Add `flutter_localizations` for Finnish/English support
- [ ] Remove `google_sign_in` (replaced by Supabase Auth)
- [ ] Remove unused UI-specific dependencies
- [ ] Update `flutter/material.dart` imports across remaining files

### 1.4 Project Structure Setup
- [ ] Create `lib/screens/` directory with MVP screen structure
- [ ] Create `lib/widgets/` directory for reusable components
- [ ] Create `lib/constants/` directory for colors, strings, subjects
- [ ] Create `lib/providers/` directory for state management
- [ ] Create `lib/l10n/` directory for localization files

## Phase 2: Core Infrastructure

### 2.1 New Models for MVP
- [ ] Create `lib/models/student.dart`
  - Student name, grade, created date
- [ ] Create `lib/models/subject.dart`
  - Finnish subject list, enum values
- [ ] Create `lib/models/exam_status.dart`
  - Draft, Processing, Ready, Failed states
- [ ] Update `lib/models/exam_models.dart`
  - Add subject field, student reference, sharing URLs

### 2.2 Supabase Services Setup
- [ ] Create `lib/services/supabase_service.dart`
  - Initialize Supabase client
  - Configure authentication listeners
  - Handle auth state changes
- [ ] Create `lib/services/auth_service.dart`
  - Google Sign-In via Supabase Auth
  - Session management through Supabase
  - First-time user detection
- [ ] Create `lib/services/student_service.dart`
  - Student CRUD operations via Supabase
  - Real-time student data synchronization

### 2.3 Localization Setup
- [ ] Create `lib/l10n/app_localizations.dart`
- [ ] Create `lib/l10n/app_fi.arb` (Finnish strings)
- [ ] Create `lib/l10n/app_en.arb` (English strings)
- [ ] Configure `MaterialApp` for localization support

### 2.4 Constants and Theme
- [ ] Create `lib/constants/colors.dart`
  - Primary: #333333, Background: #FFFFFF
- [ ] Create `lib/constants/subjects.dart`
  - Finnish school subjects dropdown list
- [ ] Create `lib/constants/app_strings.dart`
  - Finnish UI text constants
- [ ] Create `lib/theme/app_theme.dart`
  - Roboto font, button styles, consistent spacing

## Phase 3: Screen Implementation (Sequential)

### 3.1 Authentication Screens - Supabase Integration
- [ ] Create `lib/screens/login_screen.dart`
  - ExamGenie logo, "Luo koe kuvista" subtitle
  - "Kirjaudu sisään Googlella" button
  - Supabase Google OAuth integration
  - Error handling for auth failures
  - Auto-redirect on successful authentication

### 3.2 Student Setup
- [ ] Create `lib/screens/student_setup_screen.dart`
  - "Luo opiskelija" title
  - "Opiskelijan nimi" optional text field
  - "Luokka" dropdown (grades 1-9)
  - "Tallenna ja jatka" button
  - Form validation and submission

### 3.3 Main Navigation
- [ ] Create `lib/screens/landing_screen.dart`
  - App logo/title header
  - "Uusi koe" primary button
  - "Aiemmat kokeet" section
  - Navigation to create/past exams
- [ ] Create `lib/screens/settings_screen.dart`
  - Basic structure (not implemented in MVP)
  - Back arrow navigation

### 3.4 Core Exam Creation Flow
- [ ] Create `lib/screens/create_exam_screen.dart`
  - "1. Valitse aine" subject dropdown
  - "2. Lisää kuvat (max 10)" buttons
  - "Käytä valmiita kuvia" / "Ota kuvat kameralla"
  - "3. Arvioi kuvat" review section
  - Image thumbnail grid with delete buttons
  - "Luo koe" final button
  - Progressive UI enabling logic

### 3.5 Camera Integration
- [ ] Create `lib/screens/camera_screen.dart`
  - Full-screen camera preview
  - "Ota selkeä kuva oppikirjasta" overlay text
  - Circular capture button
  - Thumbnail strip with delete options
  - "Olen valmis kuvien kanssa" button
  - Max 10 images logic and disable states
  - Return to create exam with updated images

### 3.6 Processing and Results
- [ ] Create `lib/screens/progress_screen.dart`
  - Progress bar with stages
  - "Pakkaa kuvat -> Lähettää -> Luo kysymyksiä"
  - Auto-progression logic
  - Error handling: "Kokeen luonti epäonnistui"
- [ ] Create `lib/screens/exam_review_screen.dart`
  - List of 10 questions with cards
  - Question number titles, text content
  - "Korvaa" buttons for question replacement
  - "Viimeistele koe" bottom button
  - Question management logic

### 3.7 Sharing and History
- [ ] Create `lib/screens/exam_sharing_screen.dart`
  - "Koe on valmis" message
  - "Jaa WhatsAppissa" native share integration
  - "Kopioi linkki" clipboard functionality
  - Close button to return to landing
- [ ] Create `lib/screens/past_exams_screen.dart`
  - List of exams: subject, date, status
  - "Kesken" vs "Valmis" status display
  - Tap completed exam: browser launch
  - Back button navigation

## Phase 4: Service Layer Updates

### 4.1 Enhanced API Service with Supabase Integration
- [ ] Update `lib/services/exam_api_service.dart`
  - Integrate Supabase auth headers for API calls
  - Add subject parameter to exam generation
  - Add student context to API calls
  - Add exam sharing URL generation
  - Add question replacement functionality
  - Update progress tracking for new UI
- [ ] Create `lib/services/database_service.dart`
  - Supabase database operations
  - Real-time subscriptions for exam status
  - Offline data synchronization

### 4.2 Image Service Refinement
- [ ] Update `lib/services/image_compression_service.dart`
  - Optimize for 10-image maximum workflow
  - Finnish progress messages
  - Integration with new progress screen
- [ ] Enhance camera service extraction from current code
  - Clean camera controller logic
  - Multi-image capture state management
  - Integration with new camera screen

### 4.3 Sharing and Browser Services
- [ ] Create `lib/services/sharing_service.dart`
  - WhatsApp URL scheme integration
  - Clipboard operations
  - Native share sheet handling
- [ ] Create `lib/services/browser_service.dart`
  - Launch external browser for exam results
  - URL validation and error handling

## Phase 5: State Management and Integration

### 5.1 Provider Setup with Supabase State Management
- [ ] Create `lib/providers/auth_provider.dart`
  - Supabase authentication state management
  - User session via Supabase auth listener
  - Auto-refresh token handling
- [ ] Create `lib/providers/exam_provider.dart`
  - Exam creation workflow state
  - Real-time exam status updates via Supabase
  - Image list management
  - Progress tracking
- [ ] Create `lib/providers/student_provider.dart`
  - Student profile management via Supabase
  - Real-time student data synchronization
  - Grade and subject preferences

### 5.2 Navigation and Routing
- [ ] Create `lib/routes/app_router.dart`
  - Named routes for all screens
  - Authentication guards
  - Deep linking preparation
- [ ] Update `main.dart` with new routing
  - Provider initialization
  - Theme configuration
  - Localization setup

## Phase 6: Polish and Testing

### 6.1 UI/UX Refinements
- [ ] Implement consistent spacing and typography
- [ ] Add loading states and micro-interactions
- [ ] Ensure accessibility compliance
- [ ] Test Finnish/English language switching

### 6.2 Error Handling
- [ ] Implement comprehensive error boundaries
- [ ] Add retry mechanisms for network failures
- [ ] User-friendly error messages in Finnish
- [ ] Logging and crash reporting setup

### 6.3 Performance Optimization
- [ ] Image loading optimization
- [ ] Lazy loading for past exams
- [ ] Memory management for camera operations
- [ ] App startup time optimization

### 6.4 Testing and Validation
- [ ] Unit tests for core services
- [ ] Widget tests for key screens
- [ ] Integration tests for exam creation flow
- [ ] User acceptance testing with Finnish parents

## Phase 7: Production Readiness

### 7.1 Build Configuration
- [ ] Configure production API endpoints
- [ ] Set up proper app icons and splash screens
- [ ] Configure Android/iOS build settings
- [ ] Setup code signing and release preparation

### 7.2 Analytics and Monitoring
- [ ] Implement user analytics (optional)
- [ ] Error tracking integration
- [ ] Performance monitoring setup
- [ ] User feedback collection system

---

## Dependencies Summary

### New Additions Needed:
```yaml
dependencies:
  supabase_flutter: ^2.5.6
  url_launcher: ^6.2.1
  flutter_localizations:
    sdk: flutter
  intl: ^0.18.1
  provider: ^6.1.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.4
  flutter_driver:
    sdk: flutter
```

### Existing to Keep:
- `camera` - Core camera functionality
- `image_picker` - Gallery image selection
- `http` - API communication
- `file_picker` - File operations
- All image processing related packages

---

## Estimated Timeline
- **Phase 1-2**: 2-3 days (Setup and infrastructure)
- **Phase 3**: 5-7 days (Screen implementation)
- **Phase 4-5**: 3-4 days (Services and state management)
- **Phase 6-7**: 2-3 days (Polish and production prep)

**Total Estimated**: 12-17 days for complete MVP implementation