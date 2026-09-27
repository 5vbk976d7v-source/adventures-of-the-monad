# Add diagrams and YouTube links

## 1. Upload diagrams

1. Open the Hostinger File Manager.
2. Open `public_html/atlas-media/diagrams/`.
3. Open the folder for the right category, for example `01_cosmology-how-it-all-began`.
4. Upload your PNG, JPG, or WebP image files there. Upload several files at once if needed.
5. Keep the existing category folder name. Give new files the next number, for example `08_my-new-diagram.png`.
6. In WordPress, open **Tools → Atlas Media Sync** and click **Sync Atlas media**.
7. Wait for the green success message.

## 2. Add or update YouTube links

1. In WordPress, open **Tools → Atlas Media Sync** and click **Sync Atlas media**.
2. Wait for the green success message.
3. Open `public_html/atlas-media/atlas-youtube-map.ini` in Hostinger File Manager.
4. Find the new section added for your diagram. It starts with its category number, for example `[01-my-new-diagram]`.
5. Paste one YouTube link between the quotes:

   ```ini
   [01-my-new-diagram]
   video[] = "https://youtu.be/VIDEO_ID"
   ```

6. For another video, add another `video[]` line below it.
7. If there is no video, leave the empty line as it is:

   ```ini
   [01-my-new-diagram]
   video[] = "https://youtu.be/VIDEO_ID"
   video[] = "video link 2"
   ```

8. Save the file, then click **Sync Atlas media** once more in WordPress.
9. Open the Atlas and check the diagram. Its **Guided explanation** links appear below the detail hint.

Do not rename the sections in `atlas-youtube-map.ini`. Your diagrams and links stay in `atlas-media/` permanently.

## 3. Ask an agent to add content

You can ask an agent to add diagrams or YouTube links for you. Say which
category the diagram belongs to, provide the image file, and provide any YouTube
links you want attached to it.

Example prompt:

> Add these diagrams to category `01_cosmology-how-it-all-began`. Attach this
> YouTube link to the first diagram: `https://youtu.be/VIDEO_ID`. Follow the
> media README workflow, commit and push the media branch, then tell me when I
> should run Sync Atlas media.

The agent reads the media workflow in `README.md`, adds the images and video-map
entries to the `media` branch, then commits and pushes the changes. Hostinger
places that Git update in `atlas-media-git/`.

After the agent confirms the push, check **Deployment history** in
[Websites](https://hpanel.hostinger.com/websites?redirectLocation=breadcrumbs)
→ [adventuresofthemonad.com](https://hpanel.hostinger.com/websites/adventuresofthemonad.com?redirectLocation=breadcrumbs)
→ [Advanced](https://hpanel.hostinger.com/websites/adventuresofthemonad.com/advanced?redirectLocation=breadcrumbs)
→ **[GIT](https://hpanel.hostinger.com/websites/adventuresofthemonad.com/advanced/git?redirectLocation=side_menu)**. Wait until the new deployment shows as complete.

> <span style="color: #dc2626"><strong>🔴 IMPORTANT: Once the new Git deployment is complete, open WordPress → Tools → Atlas Media Sync and click Sync Atlas media.</strong></span>

This copies the new content into the permanent live media folder without
replacing your existing images or video links.
