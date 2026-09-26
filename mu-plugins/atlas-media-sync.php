<?php
/**
 * Plugin Name: Atlas Media Sync
 * Description: Adds an administrator action for reconciling Atlas folder metadata.
 * Version: 1.0.0
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

const ATLAS_MEDIA_SYNC_ACTION = 'atlas_media_sync';
const ATLAS_MEDIA_SYNC_ENDPOINT = 'https://adventuresofthemonad.com/atlas-media/sync-folder-json.php';

add_action('admin_menu', static function (): void {
    add_management_page(
        'Atlas Media Sync',
        'Atlas Media Sync',
        'manage_options',
        'atlas-media-sync',
        'atlas_media_sync_render_page'
    );
});

add_action('admin_post_' . ATLAS_MEDIA_SYNC_ACTION, 'atlas_media_sync_request');

function atlas_media_sync_render_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('You do not have permission to run the Atlas media sync.');
    }

    $status = isset($_GET['atlas_sync']) ? sanitize_key((string) $_GET['atlas_sync']) : '';
    $message = [
        'success' => ['class' => 'notice-success', 'text' => 'Atlas folder metadata was synchronized.'],
        'youtube-success' => ['class' => 'notice-success', 'text' => 'Atlas YouTube map was synchronized. Existing links were preserved.'],
        'error' => ['class' => 'notice-error', 'text' => 'Atlas folder metadata sync failed. Check the endpoint and server logs.'],
    ][$status] ?? null;
    ?>
    <div class="wrap">
        <h1>Atlas Media Sync</h1>
        <?php if ($message) : ?>
            <div class="notice <?php echo esc_attr($message['class']); ?> is-dismissible"><p><?php echo esc_html($message['text']); ?></p></div>
        <?php endif; ?>
        <p>Reconcile each Atlas category's <code>folder.json</code> with the image files currently on the media service.</p>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="<?php echo esc_attr(ATLAS_MEDIA_SYNC_ACTION); ?>">
            <?php wp_nonce_field(ATLAS_MEDIA_SYNC_ACTION); ?>
            <?php submit_button('Sync Atlas folder metadata'); ?>
        </form>
        <h2>YouTube video map</h2>
        <p>Add missing diagram IDs to <code>atlas-youtube-map.ini</code>, then edit that file to enter video links. Existing links and comments are preserved.</p>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="<?php echo esc_attr(ATLAS_MEDIA_SYNC_ACTION); ?>">
            <input type="hidden" name="operation" value="youtube">
            <?php wp_nonce_field(ATLAS_MEDIA_SYNC_ACTION); ?>
            <?php submit_button('Sync YouTube map', 'secondary'); ?>
        </form>
    </div>
    <?php
}

function atlas_media_sync_request(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        wp_die('Use the sync form to request this action.', 'Method not allowed', ['response' => 405]);
    }
    if (!current_user_can('manage_options')) {
        wp_die('You do not have permission to run the Atlas media sync.', 'Forbidden', ['response' => 403]);
    }
    check_admin_referer(ATLAS_MEDIA_SYNC_ACTION);
    $operation = $_POST['operation'] ?? 'folders';
    if (!in_array($operation, ['folders', 'youtube'], true)) atlas_media_sync_redirect('error');

    $token = defined('ATLAS_MEDIA_SYNC_TOKEN') ? (string) ATLAS_MEDIA_SYNC_TOKEN : '';
    if ($token === '') {
        atlas_media_sync_redirect('error');
    }

    $response = wp_remote_post(ATLAS_MEDIA_SYNC_ENDPOINT, [
        'timeout' => 30,
        'redirection' => 0,
        'headers' => [
            'Origin' => 'https://adventuresofthemonad.com',
            'Accept' => 'text/html',
        ],
        'body' => ['token' => $token, 'operation' => $operation],
    ]);

    if (is_wp_error($response) || (int) wp_remote_retrieve_response_code($response) !== 200) {
        atlas_media_sync_redirect('error');
    }
    atlas_media_sync_redirect($operation === 'youtube' ? 'youtube-success' : 'success');
}

function atlas_media_sync_redirect(string $status): never
{
    wp_safe_redirect(add_query_arg(
        ['page' => 'atlas-media-sync', 'atlas_sync' => $status],
        admin_url('tools.php')
    ));
    exit;
}
