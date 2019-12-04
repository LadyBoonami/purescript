#!/bin/bash

while [ -n "$1" ]; do
	case "$1" in
		"on")
			rm -r output
			./mkln.sh
			pushd "$HOME/.local/bin/"
			ln -sfv purs-prof purs
			popd
			shift
		;;

		"off")
			rm -r output
			./mkln.sh
			pushd "$HOME/.local/bin/"
			ln -sfv purs-vanilla purs
			popd
			shift
		;;

		"build")
			./npm-do.sh pulp build
			shift
		;;

		*)
			echo "Usage: $0 <on|off>"
		;;
	esac
done
