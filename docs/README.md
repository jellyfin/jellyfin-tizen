In order to publish an application, we'll be following Samsung's official guide: [TV Application Publication Process](https://developer.samsung.com/tv-seller-office/guides/applications/tv-app-publication-process.html).

Overall Steps:

Registration & Upgrade
Certification & Verification
Release


# Submission Process
## Registration & Upgrade

[Registering Applications](https://developer.samsung.com/tv-seller-office/guides/applications/registering-application.html)
- [X] Generate Application ID
- [ ] Upload Application Package

[Entering Application Information](https://developer.samsung.com/tv-seller-office/guides/applications/entering-application-information.html)
- [ ] [Registering Application Image](https://developer.samsung.com/tv-seller-office/guides/applications/entering-application-information.html#Registering-Application-Image) (Icons, Screenshots)
- [ ] Entering Application Title and Description (We have text we can use)
- [ ] Entering Service Information (We can fill in our contact info)
- [ ] Setting Service Country (We don't plan on any restrictions, all available countries will be allowed)
- [ ] Entering Billing Information (N/A, we will choose "Free")
- [ ] Entering Application Feature Information (I believe HDR, and Player)
- [ ] [Entering Verification Information](https://developer.samsung.com/tv-seller-office/guides/applications/entering-application-information.html#Entering-Verification-Information)

[Section 1 - UI Structure](/docs/App-UI-Description/1-UI-Structure/UI-Structure)

- [Arch](/docs/general/installation/linux#arch-linux)

## Certification & Verification

- [ ] Request Release, which submits for Testing

      
## Release

- [ ] Set Application Status to "For Sale"


# Assistance Required
Where we tend to slow down is in validating application functionality. Samsung collects all the templates and information required in a section called "Checklists for Distribution". There are three areas:

- [ ] [Age Rating Policy](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/age-rating.html)
- [ ] [Launch Checklist](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html)
- [ ] [Application UI Description](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/application-ui-description.html) - ⚠️ **This may be the most important step that we need help with.** ⚠️

Age Rating Policy is easy to tackle. When we submit to app stores, we have a dedicated server with content mostly similar to the public Demo Server's TV and Movie libraries. The main change is the movie library contains only the Caminandes Trilogy. This is because it ensure all the demo content is Family Friendly. LG rejected us once for that. We should be able to set app ratings similar to Plex/Emby.

Launch Checklist looks easy enough. It's just making sure we have everything in place.

Application UI Description is the most daunting. We have already documented most TV UI flow for LG, and we can take screenshots/etc for the Samsung template.