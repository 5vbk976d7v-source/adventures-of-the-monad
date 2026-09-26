# Add diagrams and YouTube links

## 1. Upload diagrams

1. Open the Hostinger File Manager.
2. Open `public_html/atlas-media/diagrams/`.
3. Open the folder for the right category, for example `01_cosmology-how-it-all-began`.
4. Upload your PNG, JPG, or WebP image files there. Upload several files at once if needed.
5. Keep the existing category folder name. Give new files the next number, for example `08_my-new-diagram.png`.
6. In WordPress, open **Tools → Atlas Media Sync** and click **Sync Atlas folder metadata**.
7. Wait for the green success message.

## 2. Add or update YouTube links

1. In WordPress, open **Tools → Atlas Media Sync** and click **Sync YouTube map** on the same page.
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

8. Save the file, then click **Sync YouTube map** once more in WordPress.
9. Open the Atlas and check the diagram. Its **Guided explanation** links appear below the detail hint.

Do not rename the sections in `atlas-youtube-map.ini`. Do not replace the whole file when uploading future code updates: it contains your edited links.
