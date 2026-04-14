<svelte:options runes={false} />
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
        connectWebSocket();
    });
</script>

<InstallModal />
<LookupModal />
<EventDetailModal />

<Header />
<div class="layout">
    <Sidebar />
    <main class="main-content">
        <TabBar />
        
        {#if $activeTab === 'events'}
            <EventTable />
        {:else if $activeTab === 'tree'}
            <ProcessTree />
        {/if}
    </main>
</div>
