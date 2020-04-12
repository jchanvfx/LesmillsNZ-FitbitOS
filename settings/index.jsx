function settingsComponent(props) {
    return (
        <Page>
            <Section title={<Text bold align="center">App Settings</Text>}/>
            <Text>Note: When changing club location please make sure to have the app open on your fitbit device.</Text>
            <Select
                title="Club Location"
                label={`Selection`}
                settingsKey="clubID"
                options={[
                    {name:"AUCKLAND CITY",
                        value:"01",
                        addr :"186 Victoria Street, Auckland"},
                    {name:"BRITOMART",
                        value:"09",
                        addr :"2 Britomart Place, Britomart"},
                    {name:"CHRISTCHURCH",
                        value:"02",
                        addr :"203 Cashel St, Christchurch Central"},
                    {name:"DUNEDIN",
                        value:"03",
                        addr :"12 Dowling St, Dunedin"},
                    {name:"HAMILTON",
                        value:"05",
                        addr :"747 Victoria Street, Hamilton"},
                    {name:"HOWICK",
                        value:"12",
                        addr :"100 Whitford Rd, Somerville"},
                    {name:"HUTT CITY",
                        value:"08",
                        addr :"7 Pretoria St, Lower Hutt"},
                    {name:"NEW LYNN",
                        value:"07",
                        addr :"2-4 Rankin Ave, New Lynn"},
                    {name:"NEWMARKET",
                        value:"13",
                        addr :"269 Khyber Pass Road, Newmarket"},
                    {name:"LAMBTON QUAY",
                        value:"10",
                        addr :"86-90 Lambton Quay, Wellington"},
                    {name:"LES MILLS AT HOME",
                        value:"LMAH",
                        addr :"Instagram LIVE, @lesmillsnz"},
                    {name:"TAKAPUNA",
                        value:"06",
                        addr :"Cnr Lake Road &, Como St,Shore City, Takapuna"},
                    {name:"TARANAKI STREET",
                        value:"04",
                        addr :"52-70 Taranaki St, Wellington"},
                ]}
                renderItem={
                    (option) =>
                    <TextImageRow
                        label={option.name}
                        sublabel={option.addr}
                    />
                }
            />
        </Page>
    );
}

registerSettingsPage(settingsComponent);
