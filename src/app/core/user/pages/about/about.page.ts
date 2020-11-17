// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SafeUrl } from '@angular/platform-browser';
import { IonRefresher } from '@ionic/angular';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreEvents } from '@singletons/events';
import { CoreUser, CoreUserProfile, CoreUserProfileRefreshedData, CoreUserProvider } from '@core/user/services/user';
import { CoreUserHelper } from '@core/user/services/user.helper';

/**
 * Page that displays info about a user.
 */
@Component({
    selector: 'page-core-user-about',
    templateUrl: 'about.html',
})
export class CoreUserAboutPage implements OnInit {

    protected courseId!: number;
    protected userId!: number;
    protected siteId: string;

    userLoaded = false;
    hasContact = false;
    hasDetails = false;
    user?: CoreUserProfile;
    title?: string;
    formattedAddress?: string;
    encodedAddress?: SafeUrl;

    constructor(
        protected route: ActivatedRoute,
    ) {
        this.siteId = CoreSites.instance.getCurrentSiteId();
    }

    /**
     * On init.
     *
     * @return Promise resolved when done.
     */
    async ngOnInit(): Promise<void> {
        this.userId = this.route.snapshot.queryParams['userId'];
        this.courseId = this.route.snapshot.queryParams['courseId'];

        this.fetchUser().finally(() => {
            this.userLoaded = true;
        });
    }

    /**
     * Fetches the user data.
     *
     * @return Promise resolved when done.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.instance.getProfile(this.userId, this.courseId);

            if (user.address) {
                this.formattedAddress = CoreUserHelper.instance.formatAddress(user.address, user.city, user.country);
                this.encodedAddress = CoreTextUtils.instance.buildAddressURL(user.address);
            }

            this.hasContact = !!(user.email || user.phone1 || user.phone2 || user.city || user.country || user.address);
            this.hasDetails = !!(user.url || user.interests || (user.customfields && user.customfields.length > 0));

            this.user = user;
            this.title = user.fullname;
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.user.errorloaduser', true);
        }
    }

    /**
     * Refresh the user data.
     *
     * @param event Event.
     * @return Promise resolved when done.
     */
    async refreshUser(event?: CustomEvent<IonRefresher>): Promise<void> {
        await CoreUtils.instance.ignoreErrors(CoreUser.instance.invalidateUserCache(this.userId));

        await this.fetchUser();

        event?.detail.complete();

        if (this.user) {
            CoreEvents.trigger<CoreUserProfileRefreshedData>(CoreUserProvider.PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user,
            }, this.siteId);
        }
    }

}
