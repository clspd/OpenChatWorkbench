console.info = new Proxy(console.info, {
    apply(target, thisArg, argumentsList) {
        if (typeof argumentsList[0] === 'string' && argumentsList[0].includes('🌐 i18next is maintained with support from Locize')) {
            return; // fuck up the ad
        }
        target.apply(thisArg, argumentsList);
    }
});
