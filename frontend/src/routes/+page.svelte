<script>
    import { onMount } from 'svelte';
    import { connectWebSocket } from '$lib/websocket.js';
    import { activeTab } from '$lib/stores.js';
    
    import Header from '$lib/components/Header.svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';
    import TabBar from '$lib/components/TabBar.svelte';
    import EventTable from '$lib/components/EventTable.svelte';
    import ProcessTree from '$lib/components/ProcessTree.svelte';
    import InstallModal from '$lib/components/InstallModal.svelte';
    import LookupModal from '$lib/components/LookupModal.svelte';
    import EventDetailModal from '$lib/components/EventDetailModal.svelte';

    onMount(() => {
        // Initialize WebSocket connection once client is ready
        connectWebSocket();
    });
</script>

<!-- Modals -->
<InstallModal />
<LookupModal />
<EventDetailModal />

<!-- Main App Surface -->
<div class="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans antialiased">
    <Header />
    <div class="flex flex-1 overflow-hidden">
        <Sidebar />
        <main class="flex-1 p-6 flex flex-col overflow-hidden relative overflow-x-auto min-w-0">
            <TabBar />
            
            {#if $activeTab === 'events'}
                <EventTable />
            {:else if $activeTab === 'tree'}
                <ProcessTree />
            {/if}
        </main>
    </div>
</div>
