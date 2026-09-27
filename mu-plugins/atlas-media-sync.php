<?php
/**
 * Plugin Name: Atlas Media Sync
 * Description: Adds an administrator action for reconciling Atlas folder metadata.
 * Version: 1.1.0
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
        'success' => ['class' => 'notice-success', 'text' => 'Atlas media was synchronized. New Git diagrams and YouTube links were imported.'],
        'error' => ['class' => 'notice-error', 'text' => 'Atlas folder metadata sync failed. Check the endpoint and server logs.'],
    ][$status] ?? null;
    $report = false;
    if ($status === 'success') {
        $report = get_transient(atlas_media_sync_result_key());
        delete_transient(atlas_media_sync_result_key());
    }
    ?>
    <div class="wrap">
        <h1>Atlas Media Sync</h1>
        <?php if ($message) : ?>
            <div class="notice <?php echo esc_attr($message['class']); ?> is-dismissible"><p><?php echo esc_html($message['text']); ?></p></div>
        <?php endif; ?>
        <?php if (is_array($report)) : ?>
            <?php $summary = is_array($report['summary'] ?? null) ? $report['summary'] : []; ?>
            <h2>Changes from this sync</h2>
            <p>
                <?php echo esc_html(sprintf(
                    '%d image(s) imported, %d metadata file(s) updated, and %d YouTube map change(s) made.',
                    (int) ($summary['images'] ?? 0),
                    (int) ($summary['metadata'] ?? 0),
                    (int) ($summary['map_links'] ?? 0) + (int) ($summary['map_sections'] ?? 0) + (int) ($summary['blank_map_sections'] ?? 0)
                )); ?>
            </p>
            <?php $files = is_array($report['imported_files'] ?? null) ? $report['imported_files'] : []; ?>
            <?php if ($files) : ?>
                <h3>Imported diagrams</h3>
                <ul><?php foreach ($files as $file) : ?><li><code><?php echo esc_html((string) $file); ?></code></li><?php endforeach; ?></ul>
            <?php endif; ?>
            <?php $updates = is_array($report['map_updates'] ?? null) ? $report['map_updates'] : []; ?>
            <?php if ($updates) : ?>
                <h3>YouTube map updates</h3>
                <ul>
                    <?php foreach ($updates as $update) : ?>
                        <?php if (!is_array($update)) continue; ?>
                        <?php $key = (string) ($update['key'] ?? ''); $type = (string) ($update['type'] ?? ''); ?>
                        <li>
                            <?php if ($type === 'section') : ?>Created section <code><?php echo esc_html($key); ?></code>.
                            <?php elseif ($type === 'link') : ?>Added link to <code><?php echo esc_html($key); ?></code>: <code><?php echo esc_html((string) ($update['url'] ?? '')); ?></code>.
                            <?php elseif ($type === 'blank-section') : ?>Added empty section <code><?php echo esc_html($key); ?></code>.
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        <?php endif; ?>
        <p>Import new Git diagrams and YouTube links, then refresh Atlas metadata. Existing live files and links are preserved.</p>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="<?php echo esc_attr(ATLAS_MEDIA_SYNC_ACTION); ?>">
            <?php wp_nonce_field(ATLAS_MEDIA_SYNC_ACTION); ?>
            <?php submit_button('Sync Atlas media'); ?>
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
    $token = defined('ATLAS_MEDIA_SYNC_TOKEN') ? (string) ATLAS_MEDIA_SYNC_TOKEN : '';
    if ($token === '') {
        atlas_media_sync_redirect('error');
    }

    $response = wp_remote_post(ATLAS_MEDIA_SYNC_ENDPOINT, [
        'timeout' => 30,
        'redirection' => 0,
        'headers' => [
            'Origin' => 'https://adventuresofthemonad.com',
            'Accept' => 'application/json',
        ],
        'body' => ['token' => $token],
    ]);

    if (is_wp_error($response) || (int) wp_remote_retrieve_response_code($response) !== 200) {
        atlas_media_sync_redirect('error');
    }
    $report = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($report) || empty($report['ok'])) {
        atlas_media_sync_redirect('error');
    }
    set_transient(atlas_media_sync_result_key(), $report, 5 * MINUTE_IN_SECONDS);
    atlas_media_sync_redirect('success');
}

function atlas_media_sync_result_key(): string
{
    return 'atlas_media_sync_result_' . get_current_user_id();
}

function atlas_media_sync_redirect(string $status): never
{
    wp_safe_redirect(add_query_arg(
        ['page' => 'atlas-media-sync', 'atlas_sync' => $status],
        admin_url('tools.php')
    ));
    exit;
}
